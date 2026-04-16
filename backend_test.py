import requests
import sys
import json
from datetime import datetime

class PrithvixAPITester:
    def __init__(self, base_url="https://60380638-0d31-4698-a619-638b83c6b02a.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_health(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "api/health", 200)

    def test_dealer_login(self):
        """Test dealer login"""
        success, response = self.run_test(
            "Dealer Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": "dealer@prithvix.com", "password": "dealer123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_staff_login(self):
        """Test staff login"""
        success, response = self.run_test(
            "Staff Login",
            "POST",
            "api/auth/login",
            200,
            data={"username": "staff01", "password": "staff123"}
        )
        if success and 'token' in response:
            print(f"   Staff token received: {response['token'][:20]}...")
            return True
        return False

    def test_auth_me(self):
        """Test auth/me endpoint"""
        return self.run_test("Get Current User", "GET", "api/auth/me", 200)

    def test_dashboard_stats(self):
        """Test dashboard stats"""
        success, response = self.run_test("Dashboard Stats", "GET", "api/dashboard/stats", 200)
        if success:
            required_fields = ['today_registrations', 'total_visits', 'money_collected', 'money_due']
            for field in required_fields:
                if field not in response:
                    print(f"   ⚠️  Missing field: {field}")
                    return False
            print(f"   📊 Stats: {response}")
        return success

    def test_dashboard_activity(self):
        """Test dashboard activity"""
        return self.run_test("Dashboard Activity", "GET", "api/dashboard/activity", 200)

    def test_dashboard_overdue(self):
        """Test dashboard overdue"""
        return self.run_test("Dashboard Overdue", "GET", "api/dashboard/overdue", 200)

    def test_farmers_list(self):
        """Test farmers list"""
        return self.run_test("Farmers List", "GET", "api/farmers", 200)

    def test_farmers_search(self):
        """Test farmers search"""
        return self.run_test("Farmers Search", "GET", "api/farmers?search=Ramesh", 200)

    def test_farmer_detail(self):
        """Test farmer detail"""
        return self.run_test("Farmer Detail", "GET", "api/farmers/F001", 200)

    def test_inventory_list(self):
        """Test inventory list"""
        return self.run_test("Inventory List", "GET", "api/inventory", 200)

    def test_inventory_stats(self):
        """Test inventory stats"""
        return self.run_test("Inventory Stats", "GET", "api/inventory/stats", 200)

    def test_credits_list(self):
        """Test credits list"""
        return self.run_test("Credits List", "GET", "api/credits", 200)

    def test_credits_stats(self):
        """Test credits stats"""
        return self.run_test("Credits Stats", "GET", "api/credits/stats", 200)

    def test_analytics_sales(self):
        """Test analytics sales"""
        return self.run_test("Analytics Sales", "GET", "api/analytics/sales", 200)

    def test_analytics_farmer_growth(self):
        """Test analytics farmer growth"""
        return self.run_test("Analytics Farmer Growth", "GET", "api/analytics/farmer-growth", 200)

    def test_analytics_collections(self):
        """Test analytics collections"""
        return self.run_test("Analytics Collections", "GET", "api/analytics/collections", 200)

    def test_analytics_inventory_breakdown(self):
        """Test analytics inventory breakdown"""
        return self.run_test("Analytics Inventory Breakdown", "GET", "api/analytics/inventory-breakdown", 200)

    def test_analytics_map_data(self):
        """Test analytics map data"""
        return self.run_test("Analytics Map Data", "GET", "api/analytics/map-data", 200)

    def test_chat_sessions(self):
        """Test chat sessions"""
        return self.run_test("Chat Sessions", "GET", "api/chat/sessions", 200)

    def test_chat_send(self):
        """Test chat send"""
        success, response = self.run_test(
            "Chat Send",
            "POST",
            "api/chat/send",
            200,
            data={"message": "What fertilizer should I use for cotton?", "language": "en"}
        )
        if success and 'response' in response:
            print(f"   🤖 AI Response: {response['response'][:50]}...")
        return success

    def test_settings_profile(self):
        """Test settings profile"""
        return self.run_test("Settings Profile", "GET", "api/settings/profile", 200)

    def test_settings_subscription(self):
        """Test settings subscription"""
        return self.run_test("Settings Subscription", "GET", "api/settings/subscription", 200)

    def test_logout(self):
        """Test logout"""
        return self.run_test("Logout", "POST", "api/auth/logout", 200)

def main():
    print("🚀 Starting Prithvix ERP API Tests...")
    tester = PrithvixAPITester()

    # Test health first
    if not tester.test_health()[0]:
        print("❌ Health check failed, stopping tests")
        return 1

    # Test dealer login
    if not tester.test_dealer_login():
        print("❌ Dealer login failed, stopping tests")
        return 1

    # Test authenticated endpoints
    test_methods = [
        tester.test_auth_me,
        tester.test_dashboard_stats,
        tester.test_dashboard_activity,
        tester.test_dashboard_overdue,
        tester.test_farmers_list,
        tester.test_farmers_search,
        tester.test_farmer_detail,
        tester.test_inventory_list,
        tester.test_inventory_stats,
        tester.test_credits_list,
        tester.test_credits_stats,
        tester.test_analytics_sales,
        tester.test_analytics_farmer_growth,
        tester.test_analytics_collections,
        tester.test_analytics_inventory_breakdown,
        tester.test_analytics_map_data,
        tester.test_chat_sessions,
        tester.test_chat_send,
        tester.test_settings_profile,
        tester.test_settings_subscription,
    ]

    for test_method in test_methods:
        test_method()

    # Test staff login separately
    print("\n🔄 Testing Staff Login...")
    tester.test_staff_login()

    # Test logout
    tester.test_logout()

    # Print results
    print(f"\n📊 Test Results:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Tests Failed: {len(tester.failed_tests)}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")

    if tester.failed_tests:
        print(f"\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"   - {failure.get('test', 'Unknown')}: {failure}")

    return 0 if len(tester.failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())