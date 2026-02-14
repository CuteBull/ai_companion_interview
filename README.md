# 多模态对话系统

基于Azure OpenAI GPT-4o的多模态对话系统，支持文字、图片、音频输入。

## 项目结构
- `frontend/` - React前端应用
- `backend/` - FastAPI后端服务
- `docs/` - 设计文档和计划

## 快速开始
1. 前端: `cd frontend && npm install && npm run dev`
2. 后端: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`