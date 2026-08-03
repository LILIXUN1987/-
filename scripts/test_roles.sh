#!/bin/bash
BASE="http://localhost:3001"
TOKEN=""
PASS=0
FAIL=0

test_api() {
  local method="$1" path="$2" desc="$3" expected="$4"
  local code body first
  if [ -n "$TOKEN" ]; then
    body=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" "$BASE$path" 2>/dev/null)
  else
    body=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" "$BASE$path" 2>/dev/null)
  fi
  code=$(echo "$body" | tail -1)
  local resp=$(echo "$body" | head -c 200)
  first="${code:0:1}"

  if [ "$expected" = "2xx" ] && [ "$first" = "2" ]; then
    echo "  ✅ $desc ($code)"
  elif [ "$expected" = "4xx" ] && [ "$first" = "4" ]; then
    echo "  ✅ $desc ($code - access controlled)"
  elif [ "$code" = "$expected" ]; then
    echo "  ✅ $desc ($code)"
  else
    echo "  ❌ $desc -> HTTP $code exp $expected"
    echo "     $resp"
    FAIL=$((FAIL+1))
  fi
}

login() {
  local user="$1"
  TOKEN=""
  local resp=$(curl -s -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$user\",\"password\":\"test123\"}" 2>/dev/null)
  TOKEN=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
  if [ -n "$TOKEN" ]; then
    echo "🔑 $user logged in"
    return 0
  else
    echo "❌ $user login FAILED: $resp"
    return 1
  fi
}

echo "════════════════════════════════════════════"
echo "  🌐 Full Role API Test"
echo "════════════════════════════════════════════"

# Admin
login "admin" && {
  test_api GET /api/dashboard "Dashboard" 2xx
  test_api GET /api/admin/stats "AdminStats" 2xx
  test_api GET /api/admin/users "Users" 2xx
  test_api GET /api/customs-coupons/admin/stats "CouponStats" 2xx
  test_api GET /api/disputes "Disputes" 2xx
  test_api GET /api/audit-logs "AuditLogs" 2xx
  test_api GET /api/api-keys "ApiKeys" 2xx
  test_api GET /api/lawyers "Lawyers" 2xx
  test_api GET /api/dg/agents "DGAgents" 2xx
  test_api GET /api/ddp/agents/all "DDPAll" 2xx
  test_api GET /api/cooperations/my-partners "Partners" 2xx
  test_api GET /api/messages/inbox "Inbox" 2xx
  test_api GET /api/favorites "Favorites" 2xx
  test_api GET /api/customs-coupons/broker-directory "BrokerDir" 2xx
  test_api GET /api/directory/inspectors "Inspectors" 2xx
  test_api GET /api/directory/insurers "Insurers" 2xx
}

# Forwarder
login "YTE" && {
  test_api GET /api/dashboard "Dashboard" 2xx
  test_api GET /api/cargo-spaces "CargoList" 2xx
  test_api GET /api/cargo-spaces/trending "Trending" 2xx
  test_api GET /api/cargo-spaces/my-stats "MyStats" 2xx
  test_api GET /api/messages/inbox "Inbox" 2xx
  test_api GET /api/customs-coupons/my-stats "CouponStats" 2xx
  test_api GET /api/customs-coupons/my-coupons "MyCoupons" 2xx
  test_api GET /api/customs-coupons/traders "Traders" 2xx
  test_api GET /api/plans/info "PlanInfo" 2xx
  test_api GET /api/ddp/agents "DDPAgents" 2xx
  test_api GET /api/cooperations/my-partners "Partners" 2xx
  test_api GET /api/favorites "Favorites" 2xx
  test_api GET /api/lawyers "Lawyers" 2xx
  test_api GET /api/dg/agents "DGAgents" 2xx
  test_api GET /api/directory/inspectors "Inspectors" 2xx
  test_api GET /api/directory/insurers "Insurers" 2xx
  test_api GET /api/customs-coupons/broker-directory "BrokerDir" 2xx
  test_api GET /api/overseas/forwarders "OverseasFwd" 2xx
  test_api GET /api/customs-coupons/available-by-port "CouponPool" 2xx
}

# Trader
login "XDN" && {
  test_api GET /api/dashboard "Dashboard" 2xx
  test_api GET /api/cargo-spaces "CargoList" 2xx
  test_api GET /api/cargo-spaces/trending "Trending" 2xx
  test_api GET /api/messages/inbox "Inbox" 2xx
  test_api GET /api/customs-coupons/my-coupons "MyCoupons" 2xx
  test_api GET /api/customs-coupons/my-stats "CouponStats" 2xx
  test_api GET /api/customs-coupons/broker-directory "BrokerDir" 2xx
  test_api GET /api/lawyers "Lawyers" 2xx
  test_api GET /api/dg/agents "DGAgents" 2xx
  test_api GET /api/favorites "Favorites" 2xx
  test_api GET /api/directory/inspectors "Inspectors" 2xx
  test_api GET /api/directory/insurers "Insurers" 2xx
}

# Overseas Agent
login "alexoversea" && {
  test_api GET /api/dashboard "Dashboard" 2xx
  test_api GET /api/messages/inbox "Inbox" 2xx
  test_api GET /api/ddp/agents "DDPAgents" 2xx
  test_api GET /api/overseas/my-profile "MyProfile" 2xx
  test_api GET /api/overseas/inquiries "Inquiries" 2xx
  test_api GET /api/overseas/my-stats "MyStats" 2xx
  test_api GET /api/cooperations/my-partners "Partners" 2xx
  test_api GET /api/plans/info "PlanInfo" 2xx
  test_api GET /api/lawyers "Lawyers" 2xx
  test_api GET /api/customs-coupons/broker-directory "BrokerDir" 2xx
  test_api GET /api/directory/inspectors "Inspectors" 2xx
  test_api GET /api/directory/insurers "Insurers" 2xx
}

# Broker
login "DS" && {
  test_api GET /api/dashboard "Dashboard" 2xx
  test_api GET /api/messages/inbox "Inbox" 2xx
  test_api GET /api/customs-coupons/broker/stats "BrokerStats" 2xx
  test_api GET /api/customs-coupons/broker/orders "BrokerOrders" 2xx
  test_api GET /api/customs-coupons/broker-directory "BrokerDir" 2xx
  test_api GET /api/lawyers "Lawyers" 2xx
  test_api GET /api/directory/inspectors "Inspectors" 2xx
  test_api GET /api/directory/insurers "Insurers" 2xx
}

# Lawyer
login "lawyer" && {
  test_api GET /api/dashboard "Dashboard" 2xx
  test_api GET /api/messages/inbox "Inbox" 2xx
  test_api GET /api/messages/lawyer-consultations "Consultations" 2xx
  test_api GET /api/lawyers "LawyersList" 2xx
  test_api GET /api/customs-coupons/broker-directory "BrokerDir" 2xx
  test_api GET /api/directory/inspectors "Inspectors" 2xx
  test_api GET /api/directory/insurers "Insurers" 2xx
}

# Inspector
login "inspector" && {
  test_api GET /api/dashboard "Dashboard" 2xx
  test_api GET /api/messages/inbox "Inbox" 2xx
  test_api GET /api/messages/service-consultations "Consultations" 2xx
  test_api GET /api/directory/inspectors "InspectorList" 2xx
}

# Insurer
login "insurer" && {
  test_api GET /api/dashboard "Dashboard" 2xx
  test_api GET /api/messages/inbox "Inbox" 2xx
  test_api GET /api/messages/service-consultations "Consultations" 2xx
  test_api GET /api/directory/insurers "InsurerList" 2xx
}

echo ""
echo "════════════════════════════════════════════"
echo "  📊 Total: $((PASS+FAIL)) tests, $PASS passed, $FAIL failed"
echo "════════════════════════════════════════════"
