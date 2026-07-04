import os
from dotenv import load_dotenv
load_dotenv()

from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import List

# 1. We updated 'edges' to a clean List of Strings to fix the Pydantic validation error
class LogAnalysisResult(BaseModel):
    nodes: List[str] = Field(description="List of all unique microservices, systems, or databases discovered in the log lines.")
    edges: List[str] = Field(description="List of connections between components written exactly as strings, matching this format: 'SourceComponent -> TargetComponent'. Example: 'Gateway -> AuthService'.")
    failed_node: str = Field(description="The exact name of the component/service where the failure or crash originated.")
    error_summary: str = Field(description="A short, concise one-sentence description of the root cause of the error.")
    fix_suggestion: str = Field(description="A step-by-step technical instruction or code snippet detailing how an engineer can fix the bug.")

def analyze_log_with_ai(log_text: str) -> LogAnalysisResult:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is missing! Please set it before running.")
    
    client = genai.Client(api_key=api_key)
    
    prompt = f"""
    You are an expert Site Reliability Engineer and Data Architect.
    Analyze the following raw server crash logs. Your job is to trace the execution path and identify the failure sequence.
    
    CRITICAL RULE FOR FAILED_NODE: Look closely at the timestamps. You must identify the TRUE ROOT CAUSE of the failure (the very first component that threw an error or timed out), NOT a downstream component that crashed as a side effect.
    
    Raw Log Text:
    ---
    {log_text}
    ---
    
    Extract the structural component workflow graph, identify the true root cause component that failed first, summarize the error, and provide a clear remediation fix code/snippet.
    """
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=LogAnalysisResult,
            temperature=0.1,
        ),
    )
    
    return response.text