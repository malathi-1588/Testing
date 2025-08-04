# Quiz Automation using Playwright and OpenAI
Automates taking the sample AI Quiz at:  
https://ai-quizzes-rho.vercel.app/ai-quiz-sample.html

This script uses **Playwright** to control a browser, scrapes each quiz question and options, queries **OpenAI GPT-4** to pick the best answer, submits it, and logs the full run including the final score. OpenAI logic is modularized in `openai_client.py`.

