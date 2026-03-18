# from fastapi import FastAPI, UploadFile, File
# from fastapi.middleware.cors import CORSMiddleware
# import os
# from dotenv import load_dotenv
# import google.generativeai as genai

# # טעינת המשתנים מקובץ ה-.env
# load_dotenv()
# api_key = os.getenv("GOOGLE_API_KEY")
# genai.configure(api_key=api_key)

# app = FastAPI()

# # מאפשר ל-React (שמוריץ על פורט 5173) לדבר עם השרת
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"], # ב-MVP נאפשר הכל, בייצור נצמצם
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# @app.get("/")
# def read_root():
#     return {"message": "CheckTest AI Server is running!"}

# @app.post("/analyze-exam")
# async def analyze_exam(file: UploadFile = File(...)):
#     # כאן יבוא הקסם של ה-AI
#     print(f"Received file: {file.filename}")
    
#     # בנתיים נחזיר תשובה דמה כדי לראות שהחיבור עובד
#     return {
#         "status": "success",
#         "data": [
#             {
#                 "id": 1,
#                 "questionNumber": "1",
#                 "studentAnswer": "התשובה שחולצה מהקובץ...",
#                 "aiEvaluation": "correct",
#                 "missingInfo": "",
#                 "recommendedScore": "10/10",
#                 "finalScore": 10
#             }
#         ]
#     }

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)



import os
import json
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import ssl
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
os.environ["CURL_CA_BUNDLE"] = ""
os.environ["PYTHONHTTPSVERIFY"] = "0"
ssl._create_default_https_context = ssl._create_unverified_context
# LlamaIndex & Integrations
from llama_index.core import VectorStoreIndex, StorageContext, Document
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.embeddings.cohere import CohereEmbedding
from llama_index.llms.gemini import Gemini
from pinecone import Pinecone
from llama_index.multi_modal_llms.gemini import GeminiMultiModal

# טעינת הגדרות
load_dotenv()

app = FastAPI()

# הגדרת CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- אתחול רכיבי ה-AI ---

# 1. Cohere Embedding (עבור החיפוש הסמנטי בעברית - Dimension 1024)
embed_model = CohereEmbedding(
    cohere_api_key=os.getenv("COHERE_API_KEY"),
    model_name="embed-multilingual-v3.0",
)

# 2. Gemini LLM (עבור ניתוח התשובות וה-OCR)
llm = Gemini(
    api_key=os.getenv("GOOGLE_API_KEY"),
    model_name="models/gemini-2.5-flash",
    transport="rest"
)

# 3. Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
pinecone_index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))
vector_store = PineconeVectorStore(pinecone_index=pinecone_index)
storage_context = StorageContext.from_defaults(vector_store=vector_store)

# --- נתיבים (Endpoints) ---

@app.get("/")
def health_check():
    return {"status": "running", "engine": "LlamaIndex + Gemini + Cohere"}

@app.post("/setup-resources")
async def setup_resources(file: UploadFile = File(...)):
    """שלב ה-Ingestion: קבלת הסילבוס (עד 200 דפים) ואינדוקסו"""
    try:
        content = await file.read()
        # כאן ב-MVP אנחנו הופכים את ה-PDF לטקסט פשוט (Document)
        # בפרויקט מלא נשתמש ב-SimpleDirectoryReader
        doc = Document(text=content.decode('utf-8', errors='ignore'), metadata={"filename": file.filename})
        
        # יצירת האינדקס ב-Pinecone
        index = VectorStoreIndex.from_documents(
            [doc], 
            storage_context=storage_context,
            embed_model=embed_model
        )
        return {"status": "success", "message": f"File {file.filename} indexed successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/analyze-exam")
async def analyze_exam(file: UploadFile = File(...)):
    """שלב ה-Grading: ניתוח מבחן סרוק מול המידע ב-Pinecone"""
    try:
        # 1. קריאת קובץ המבחן (תמונה/PDF)
        file_bytes = await file.read()
        
        # 2. שימוש ב-Gemini כדי להבין מה השאלה והתשובה מהתמונה (OCR + Understanding)
        # אנחנו יוצרים Prompt שמשלב את התמונה
        mm_model = GeminiMultiModal(
            api_key=os.getenv("GOOGLE_API_KEY"),
            model_name="models/gemini-2.5-flash",
            transport="rest" # חשוב לעקיפת SSL
        )        
        # שליחת התמונה ל-Gemini לחילוץ טקסט
        complete_response = mm_model.complete(
            prompt="זהו מבחן בהיסטוריה. חלץ את השאלה ואת תשובת התלמידה בכתב היד. החזר רק את הטקסט שמצאת.",
            image_documents=[Document(text="", metadata={"bytes": file_bytes})] # ב-LlamaIndex החדש
        )
        detected_text = complete_response.text

        # 3. Retrieval: חיפוש החומר הרלוונטי ב-Pinecone לפי הטקסט שחולץ
        index = VectorStoreIndex.from_vector_store(vector_store, embed_model=embed_model)
        query_engine = index.as_query_engine(llm=llm)
        
        # השאילתה ל-RAG: השוואת התשובה שחולצה לחומר המקור
        rag_prompt = f"""
        הנה תשובה של תלמידה שחולצה ממבחן: {detected_text}
        בהתבסס על חומר הלימוד שבאינדקס, האם התשובה נכונה? 
        החזר תשובה במבנה JSON בלבד עם השדות הבאים: 
        id, questionNumber, studentAnswer, aiEvaluation (correct/partial/wrong), missingInfo, recommendedScore, finalScore.
        """
        
        response = query_engine.query(rag_prompt)
        
        # 4. ניקוי והחזרת התוצאה ל-React
        try:
            clean_json = response.response.replace('```json', '').replace('```', '').strip()
            data = json.loads(clean_json)
            # אם זה אובייקט בודד, נעטוף אותו במערך עבור ה-Frontend
            result_data = data if isinstance(data, list) else [data]
            return {"status": "success", "data": result_data}
        except:
             return {"status": "success", "data": [{"id": 1, "questionNumber": "זיהוי אוטומטי", "studentAnswer": detected_text, "aiEvaluation": "check", "missingInfo": "נא לבדוק ידנית", "recommendedScore": "N/A", "finalScore": 0}]}

    except Exception as e:
        print(f"Error: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)