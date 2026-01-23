#!/usr/bin/env python3
"""
MAMÁ RESPIRA Backend API Tests
Tests all backend endpoints with focus on Claude AI integration
"""

import requests
import json
import time
from datetime import datetime

# Base URL from frontend .env
BASE_URL = "https://mamapanic.preview.emergentagent.com/api"

def test_api_root():
    """Test API root endpoint"""
    print("🔍 Testing API Root endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_validation_cards():
    """Test validation cards endpoints"""
    print("\n🔍 Testing Validation Cards endpoints...")
    
    # Test get all validations
    try:
        print("Testing GET /api/validations...")
        response = requests.get(f"{BASE_URL}/validations")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Found {len(data)} validation cards")
            if len(data) > 0:
                print(f"Sample card: {data[0]['message_es'][:50]}...")
        else:
            print(f"Error response: {response.text}")
    except Exception as e:
        print(f"❌ Error getting all validations: {e}")
        return False
    
    # Test get random validation
    try:
        print("\nTesting GET /api/validations/random...")
        response = requests.get(f"{BASE_URL}/validations/random")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Random validation: {data['message_es']}")
            print(f"Category: {data['category']}")
            return True
        else:
            print(f"Error response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error getting random validation: {e}")
        return False

def test_community_presence():
    """Test community presence endpoint"""
    print("\n🔍 Testing Community Presence endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/community/presence")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Online count: {data['online_count']}")
            print(f"Sample names: {data['sample_names']}")
            print(f"Message: {data['message']}")
            return True
        else:
            print(f"Error response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_daily_checkin():
    """Test daily check-in creation with AI validation (HIGH PRIORITY)"""
    print("\n🔍 Testing Daily Check-in with AI Validation (HIGH PRIORITY)...")
    
    # Test creating a check-in
    checkin_data = {
        "mood": 1,
        "brain_dump": "No dormí nada anoche, el bebé lloró toda la madrugada y me siento agotada"
    }
    
    try:
        print("Testing POST /api/checkins...")
        print(f"Sending data: {checkin_data}")
        
        response = requests.post(
            f"{BASE_URL}/checkins",
            json=checkin_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Check-in created successfully!")
            print(f"ID: {data['id']}")
            print(f"Mood: {data['mood']}")
            print(f"Brain dump: {data['brain_dump']}")
            print(f"AI Response: {data['ai_response']}")
            
            # Verify AI response is in Spanish and empathetic
            ai_response = data['ai_response']
            if ai_response and len(ai_response) > 10:
                print("✅ AI validation response received and non-empty")
                # Check if response is in Spanish (basic check)
                spanish_indicators = ['mamá', 'bebé', 'está', 'eres', 'tu', 'no', 'sí', 'bien', 'amor']
                has_spanish = any(word in ai_response.lower() for word in spanish_indicators)
                if has_spanish:
                    print("✅ AI response appears to be in Spanish")
                else:
                    print("⚠️ AI response may not be in Spanish")
            else:
                print("❌ AI response is empty or too short")
                return False
                
        else:
            print(f"❌ Error response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error creating check-in: {e}")
        return False
    
    # Test getting check-ins
    try:
        print("\nTesting GET /api/checkins...")
        response = requests.get(f"{BASE_URL}/checkins")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Found {len(data)} check-ins")
            if len(data) > 0:
                print(f"Latest check-in mood: {data[0]['mood']}")
            return True
        else:
            print(f"Error response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error getting check-ins: {e}")
        return False

def test_chat_with_claude():
    """Test chat endpoint with Claude AI (HIGH PRIORITY)"""
    print("\n🔍 Testing Chat with Claude AI (HIGH PRIORITY)...")
    
    session_id = "test_session_123"
    chat_message = {
        "session_id": session_id,
        "content": "Estoy muy cansada y no sé qué hacer"
    }
    
    try:
        print("Testing POST /api/chat...")
        print(f"Sending message: {chat_message}")
        
        response = requests.post(
            f"{BASE_URL}/chat",
            json=chat_message,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Chat message sent successfully!")
            print(f"Message ID: {data['id']}")
            print(f"Session ID: {data['session_id']}")
            print(f"Role: {data['role']}")
            print(f"AI Response: {data['content']}")
            
            # Verify AI response quality
            ai_response = data['content']
            if ai_response and len(ai_response) > 20:
                print("✅ Claude AI response received and substantial")
                
                # Check if response is empathetic and in Spanish
                empathy_indicators = ['entiendo', 'comprendo', 'sé', 'normal', 'está bien', 'respira']
                spanish_indicators = ['mamá', 'bebé', 'está', 'eres', 'tu', 'no', 'sí', 'bien', 'amor']
                
                has_empathy = any(word in ai_response.lower() for word in empathy_indicators)
                has_spanish = any(word in ai_response.lower() for word in spanish_indicators)
                
                if has_empathy:
                    print("✅ AI response appears empathetic")
                else:
                    print("⚠️ AI response may lack empathy indicators")
                    
                if has_spanish:
                    print("✅ AI response appears to be in Spanish")
                else:
                    print("⚠️ AI response may not be in Spanish")
                    
            else:
                print("❌ AI response is empty or too short")
                return False
                
        else:
            print(f"❌ Error response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error sending chat message: {e}")
        return False
    
    # Test getting chat history
    try:
        print(f"\nTesting GET /api/chat/{session_id}...")
        response = requests.get(f"{BASE_URL}/chat/{session_id}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Chat history retrieved successfully!")
            print(f"Found {len(data)} messages in session")
            
            # Verify we have both user and assistant messages
            user_msgs = [msg for msg in data if msg['role'] == 'user']
            assistant_msgs = [msg for msg in data if msg['role'] == 'assistant']
            
            print(f"User messages: {len(user_msgs)}")
            print(f"Assistant messages: {len(assistant_msgs)}")
            
            if len(user_msgs) > 0 and len(assistant_msgs) > 0:
                print("✅ Chat history contains both user and assistant messages")
                return True
            else:
                print("❌ Chat history missing user or assistant messages")
                return False
        else:
            print(f"❌ Error response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error getting chat history: {e}")
        return False

def main():
    """Run all backend tests"""
    print("🚀 Starting MAMÁ RESPIRA Backend API Tests")
    print(f"Base URL: {BASE_URL}")
    print("=" * 60)
    
    results = {}
    
    # Test API Root
    results['api_root'] = test_api_root()
    
    # Test Validation Cards
    results['validation_cards'] = test_validation_cards()
    
    # Test Community Presence
    results['community_presence'] = test_community_presence()
    
    # Test Daily Check-in (HIGH PRIORITY)
    results['daily_checkin'] = test_daily_checkin()
    
    # Test Chat with Claude (HIGH PRIORITY)
    results['chat_claude'] = test_chat_with_claude()
    
    # Summary
    print("\n" + "=" * 60)
    print("🏁 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    total_tests = len(results)
    passed_tests = sum(results.values())
    
    print(f"\nTotal: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed!")
    else:
        print("⚠️ Some tests failed - check logs above")
    
    return results

if __name__ == "__main__":
    main()

 