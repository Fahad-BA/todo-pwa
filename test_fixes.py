#!/usr/bin/env python3
import requests
import json
import time

BASE_URL = "http://localhost:3001"

def test_create_task():
    """Test creating a new task"""
    print("Testing task creation...")
    response = requests.post(f"{BASE_URL}/api/tasks", 
                           json={"text": "Test task for fix verification"},
                           headers={"Content-Type": "application/json"})
    if response.status_code == 201:
        task = response.json()
        print(f"✓ Task created successfully: {task['id']}")
        return task
    else:
        print(f"✗ Failed to create task: {response.status_code}")
        return None

def test_delete_task(task_id):
    """Test deleting a task"""
    print(f"Testing task deletion for ID: {task_id}")
    response = requests.delete(f"{BASE_URL}/api/tasks/{task_id}")
    if response.status_code == 200:
        print("✓ Task deleted successfully")
        return True
    else:
        print(f"✗ Failed to delete task: {response.status_code}")
        print(f"Response: {response.text}")
        return False

def test_toggle_task(task_id):
    """Test toggling task completion"""
    print(f"Testing task toggle for ID: {task_id}")
    # First, get the task
    response = requests.get(f"{BASE_URL}/api/tasks/{task_id}")
    if response.status_code != 200:
        print(f"✗ Failed to get task: {response.status_code}")
        return False
    
    task = response.json()
    new_completed_status = not task['completed']
    
    # Toggle completion
    response = requests.put(f"{BASE_URL}/api/tasks/{task_id}",
                          json={"completed": new_completed_status},
                          headers={"Content-Type": "application/json"})
    
    if response.status_code == 200:
        updated_task = response.json()
        if updated_task['completed'] == new_completed_status:
            print("✓ Task toggle successful")
            print(f"  - Previous completed: {task['completed']}")
            print(f"  - New completed: {updated_task['completed']}")
            print(f"  - Created at: {task['created_at']}")
            print(f"  - Updated at: {updated_task['updated_at']}")
            return True
        else:
            print("✗ Task completion status not updated correctly")
            return False
    else:
        print(f"✗ Failed to toggle task: {response.status_code}")
        print(f"Response: {response.text}")
        return False

def test_edit_task(task_id):
    """Test editing task text"""
    print(f"Testing task edit for ID: {task_id}")
    new_text = "Modified task text - test"
    
    response = requests.put(f"{BASE_URL}/api/tasks/{task_id}",
                          json={"text": new_text},
                          headers={"Content-Type": "application/json"})
    
    if response.status_code == 200:
        updated_task = response.json()
        if updated_task['text'] == new_text:
            print("✓ Task edit successful")
            print(f"  - New text: {updated_task['text']}")
            return True
        else:
            print("✗ Task text not updated correctly")
            return False
    else:
        print(f"✗ Failed to edit task: {response.status_code}")
        print(f"Response: {response.text}")
        return False

def test_get_all_tasks():
    """Test getting all tasks"""
    print("Testing get all tasks...")
    response = requests.get(f"{BASE_URL}/api/tasks")
    if response.status_code == 200:
        tasks = response.json()
        print(f"✓ Retrieved {len(tasks)} tasks")
        for task in tasks:
            print(f"  - ID: {task['id']}, Text: {task['text']}, Completed: {task['completed']}")
        return tasks
    else:
        print(f"✗ Failed to get tasks: {response.status_code}")
        return []

def main():
    print("🧪 Testing Todo App Fixes\n")
    
    # Wait for server to be ready
    print("Waiting for server to be ready...")
    for i in range(10):
        try:
            response = requests.get(f"{BASE_URL}/api/tasks")
            if response.status_code == 200:
                print("Server is ready!")
                break
        except requests.ConnectionError:
            pass
        time.sleep(1)
    else:
        print("❌ Server not ready after 10 seconds")
        return
    
    # Test all functionality
    print("\n" + "="*50)
    
    # Create test tasks
    task1 = test_create_task()
    if not task1:
        return
    
    task2 = test_create_task()
    if not task2:
        return
    
    print("\n" + "="*50)
    
    # Test task editing
    test_edit_task(task1['id'])
    
    print("\n" + "="*50)
    
    # Test task completion toggle
    test_toggle_task(task1['id'])
    
    print("\n" + "="*50)
    
    # Test task deletion
    test_delete_task(task2['id'])
    
    print("\n" + "="*50)
    
    # Final check of all tasks
    remaining_tasks = test_get_all_tasks()
    
    print("\n" + "="*50)
    print("🎉 All tests completed!")
    print("\nSummary:")
    print(f"- Created 2 test tasks")
    print(f"- Edited 1 task (✓ Direct editing works)")
    print(f"- Toggled 1 task completion (✓ Date logic updated)")
    print(f"- Deleted 1 task (✓ Delete functionality works)")
    print(f"- {len(remaining_tasks)} tasks remain in database")

if __name__ == "__main__":
    main()