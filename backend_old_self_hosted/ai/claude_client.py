"""Claude AI client using direct Anthropic SDK"""
import os
import logging
from typing import List, Optional
from anthropic import AsyncAnthropic

logger = logging.getLogger(__name__)

# Get API key from environment
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')


class ClaudeClient:
    """Client for interacting with Claude AI via Anthropic SDK"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Claude client
        
        Args:
            api_key: Anthropic API key (uses env var if not provided)
        """
        self.api_key = api_key or ANTHROPIC_API_KEY
        if not self.api_key or self.api_key == 'your_anthropic_api_key_here':
            logger.warning("Anthropic API key not configured - AI features will return fallback messages")
            self.client = None
        else:
            self.client = AsyncAnthropic(api_key=self.api_key)
        
    async def send_message(
        self,
        system_prompt: str,
        user_message: str,
        conversation_history: Optional[List[dict]] = None,
        model: str = "claude-sonnet-4-20250514",
        max_tokens: int = 500
    ) -> str:
        """
        Send a message to Claude and get response
        
        Args:
            system_prompt: System prompt defining Claude's behavior
            user_message: User's message
            conversation_history: Previous messages in format [{"role": "user", "content": "..."}, ...]
            model: Claude model to use
            max_tokens: Maximum tokens in response
            
        Returns:
            Claude's response text
        """
        if not self.client:
            logger.error("Claude client not initialized - API key missing")
            return self._get_fallback_message()
        
        try:
            # Build messages array
            messages = []
            
            # Add conversation history if provided
            if conversation_history:
                for msg in conversation_history:
                    if msg.get('role') in ['user', 'assistant']:
                        messages.append({
                            "role": msg['role'],
                            "content": msg['content']
                        })
            
            # Add current user message
            messages.append({
                "role": "user",
                "content": user_message
            })
            
            # Call Claude API
            response = await self.client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=messages
            )
            
            # Extract text from response
            if response.content and len(response.content) > 0:
                return response.content[0].text
            else:
                logger.error("Empty response from Claude API")
                return self._get_fallback_message()
                
        except Exception as e:
            logger.error(f"Error calling Claude API: {e}")
            return self._get_fallback_message()
    
    def _get_fallback_message(self) -> str:
        """Return a fallback message when AI is unavailable"""
        return "Lo siento, no pude responder ahora. Recuerda: estás haciendo un gran trabajo. Respira profundo. 💛"
