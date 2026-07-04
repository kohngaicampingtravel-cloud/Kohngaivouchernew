from flask import Flask, request, jsonify
import google.generativeai as genai
import os

app = Flask(__name__)

# ดึงรหัส API Key จากระบบความปลอดภัยของ Vercel
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

@app.route('/', sorted_methods=['GET'])
def home():
    return jsonify({"status": "Kohngaivoucher AI API is running"})

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get("message", "")
        
        # เรียกใช้งานโมเดลจาก AI Studio (เช่น gemini-1.5-flash)
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(user_message)
        
        return jsonify({"reply": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# บรรทัดนี้สำคัญมาก ห้ามลบ เพื่อให้ Vercel ดึงไปรันได้
text_handler = app 
