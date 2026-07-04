import originalHtml2canvas from 'html2canvas';

/**
 * Converts OKLCH colors to standard HSL/HSLA colors which html2canvas can parse.
 * Standard Tailwind v4 generates oklch() colors which crash html2canvas's CSS parser.
 */
export function convertOklchToHsl(cssText: string): string {
  return cssText.replace(/oklch\(([^)]+)\)/g, (match, content) => {
    try {
      // Split by spaces, slashes, or commas
      const parts = content.trim().split(/[\s,\/]+/).filter(Boolean);
      if (parts.length < 3) return match;
      
      const lStr = parts[0];
      const cStr = parts[1];
      const hStr = parts[2];
      const aStr = parts[3]; // Optional alpha
      
      // 1. Lightness (L)
      let lVal = 0;
      if (lStr.endsWith('%')) {
        lVal = parseFloat(lStr);
      } else {
        lVal = parseFloat(lStr) * 100;
      }
      lVal = Math.max(0, Math.min(100, lVal));
      
      // 2. Chroma (C)
      const cVal = parseFloat(cStr);
      // Map Chroma to HSL Saturation: Chroma of 0.4 represents max saturation
      let sVal = Math.round(cVal * 250);
      sVal = Math.max(0, Math.min(100, sVal));
      
      // 3. Hue (H)
      let hVal = parseFloat(hStr);
      if (isNaN(hVal)) hVal = 0;
      
      // 4. Alpha (A)
      if (aStr) {
        let aVal = 1;
        if (aStr.endsWith('%')) {
          aVal = parseFloat(aStr) / 100;
        } else {
          aVal = parseFloat(aStr);
        }
        aVal = Math.max(0, Math.min(1, aVal));
        return `hsla(${hVal.toFixed(1)}, ${sVal}%, ${lVal.toFixed(1)}%, ${aVal})`;
      } else {
        return `hsl(${hVal.toFixed(1)}, ${sVal}%, ${lVal.toFixed(1)}%)`;
      }
    } catch (e) {
      console.warn('Error converting oklch:', match, e);
      return match;
    }
  });
}

/**
 * Converts OKLAB colors to standard HSL/HSLA colors which html2canvas can parse.
 * Standard Tailwind v4 generates oklab() colors which crash html2canvas's CSS parser.
 */
export function convertOklabToHsl(cssText: string): string {
  return cssText.replace(/oklab\(([^)]+)\)/g, (match, content) => {
    try {
      const parts = content.trim().split(/[\s,\/]+/).filter(Boolean);
      if (parts.length < 3) return match;
      
      const lStr = parts[0];
      const aStr = parts[1];
      const bStr = parts[2];
      const alphaStr = parts[3]; // Optional alpha
      
      // 1. Lightness (L)
      let lVal = 0;
      if (lStr.endsWith('%')) {
        lVal = parseFloat(lStr);
      } else {
        lVal = parseFloat(lStr) * 100;
      }
      lVal = Math.max(0, Math.min(100, lVal));
      
      // 2. a and b to Chroma (C) and Hue (H)
      const aVal = parseFloat(aStr);
      const bVal = parseFloat(bStr);
      const cVal = Math.sqrt(aVal * aVal + bVal * bVal);
      let hVal = (Math.atan2(bVal, aVal) * 180 / Math.PI + 360) % 360;
      if (isNaN(hVal)) hVal = 0;
      
      // Map Chroma to HSL Saturation
      let sVal = Math.round(cVal * 250);
      sVal = Math.max(0, Math.min(100, sVal));
      
      // 3. Alpha (A)
      if (alphaStr) {
        let aPercent = 1;
        if (alphaStr.endsWith('%')) {
          aPercent = parseFloat(alphaStr) / 100;
        } else {
          aPercent = parseFloat(alphaStr);
        }
        aPercent = Math.max(0, Math.min(1, aPercent));
        return `hsla(${hVal.toFixed(1)}, ${sVal}%, ${lVal.toFixed(1)}%, ${aPercent})`;
      } else {
        return `hsl(${hVal.toFixed(1)}, ${sVal}%, ${lVal.toFixed(1)}%)`;
      }
    } catch (e) {
      console.warn('Error converting oklab:', match, e);
      return match;
    }
  });
}

/**
 * A wrapper around html2canvas that temporarily resolves oklch() and oklab() color definitions
 * in all document <style> elements and intercepts computed styles during execution
 * to prevent parser crashes.
 */
export default async function safeHtml2canvas(element: HTMLElement, options?: any) {
  const stylesWithUnsupportedColors: { element: HTMLStyleElement; originalText: string }[] = [];
  const styleElements = document.querySelectorAll('style');
  
  styleElements.forEach((styleEl) => {
    if (styleEl.textContent && (styleEl.textContent.includes('oklch') || styleEl.textContent.includes('oklab'))) {
      stylesWithUnsupportedColors.push({
        element: styleEl,
        originalText: styleEl.textContent
      });
      
      try {
        let converted = convertOklchToHsl(styleEl.textContent);
        converted = convertOklabToHsl(converted);
        styleEl.textContent = converted;
      } catch (err) {
        console.error('Error applying color conversion to stylesheet', err);
      }
    }
  });

  // Temporarily override getComputedStyle to convert oklch/oklab to hsl
  const ownerWindow = element.ownerDocument?.defaultView || window;
  const originalGetComputedStyle = ownerWindow.getComputedStyle;
  
  const customGetComputedStyle = function (elt: Element, pseudoElt?: string | null) {
    const style = originalGetComputedStyle.call(ownerWindow, elt, pseudoElt);
    return new Proxy(style, {
      get(target, prop) {
        const val = Reflect.get(target, prop);
        if (typeof val === 'function') {
          if (prop === 'getPropertyValue') {
            return function (propertyName: string) {
              const originalVal = target.getPropertyValue(propertyName);
              if (typeof originalVal === 'string' && (originalVal.includes('oklch') || originalVal.includes('oklab'))) {
                return convertOklabToHsl(convertOklchToHsl(originalVal));
              }
              return originalVal;
            };
          }
          return val.bind(target);
        }
        if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
          return convertOklabToHsl(convertOklchToHsl(val));
        }
        return val;
      }
    });
  };

  try {
    // Apply style wrapper override
    ownerWindow.getComputedStyle = customGetComputedStyle as any;
    if (ownerWindow !== window) {
      window.getComputedStyle = customGetComputedStyle as any;
    }
    
    const canvas = await originalHtml2canvas(element, options);
    return canvas;
  } finally {
    // Restore original getComputedStyle
    ownerWindow.getComputedStyle = originalGetComputedStyle;
    if (ownerWindow !== window) {
      window.getComputedStyle = originalGetComputedStyle;
    }

    // Restore original stylesheets to maintain premium high-fidelity oklch/oklab colors on the screen
    stylesWithUnsupportedColors.forEach(({ element, originalText }) => {
      try {
        element.textContent = originalText;
      } catch (err) {
        console.error('Error restoring stylesheet textContent', err);
      }
    });
  }
}
