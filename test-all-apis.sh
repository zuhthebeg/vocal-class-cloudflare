#!/bin/bash

echo "=== Testing Vocal Class APIs ==="
echo ""

BASE_URL="http://127.0.0.1:8788"

echo "1. Testing AUTH API..."
echo "   Creating teacher..."
TEACHER=$(curl -s -X POST "$BASE_URL/api/auth" -H "Content-Type: application/json" -d '{"name":"김선생","role":"teacher"}')
echo "   Response: $TEACHER"
TEACHER_ID=$(echo $TEACHER | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)
echo "   Teacher ID: $TEACHER_ID"
echo ""

echo "   Creating student..."
STUDENT=$(curl -s -X POST "$BASE_URL/api/auth" -H "Content-Type: application/json" -d '{"name":"이학생","role":"student"}')
echo "   Response: $STUDENT"
STUDENT_ID=$(echo $STUDENT | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)
echo "   Student ID: $STUDENT_ID"
echo ""

echo "   Getting all students..."
curl -s "$BASE_URL/api/auth?role=student"
echo ""
echo ""

echo "2. Testing SCHEDULE API..."
echo "   Creating schedule..."
curl -s -X POST "$BASE_URL/api/schedule" -H "Content-Type: application/json" -d "{\"teacherId\":$TEACHER_ID,\"date\":\"2025-11-10\",\"timeSlots\":[\"10:00\",\"11:00\",\"14:00\"]}"
echo ""
echo ""

echo "   Getting schedules..."
curl -s "$BASE_URL/api/schedule?teacherId=$TEACHER_ID&startDate=2025-11-01&endDate=2025-11-30"
echo ""
echo ""

echo "3. Testing BOOKINGS API..."
echo "   Creating booking..."
BOOKING=$(curl -s -X POST "$BASE_URL/api/bookings" -H "Content-Type: application/json" -d "{\"studentId\":$STUDENT_ID,\"teacherId\":$TEACHER_ID,\"bookingDate\":\"2025-11-10\",\"suggestedTimeSlots\":[\"10:00\",\"11:00\"]}")
echo "   Response: $BOOKING"
BOOKING_ID=$(echo $BOOKING | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)
echo "   Booking ID: $BOOKING_ID"
echo ""

echo "   Getting bookings for teacher..."
curl -s "$BASE_URL/api/bookings?teacherId=$TEACHER_ID"
echo ""
echo ""

echo "   Getting bookings for student..."
curl -s "$BASE_URL/api/bookings?studentId=$STUDENT_ID"
echo ""
echo ""

echo "4. Testing ATTENDANCE API..."
echo "   Getting attendance..."
curl -s "$BASE_URL/api/attendance?studentId=$STUDENT_ID"
echo ""
echo ""

echo "=== All Tests Complete ==="
