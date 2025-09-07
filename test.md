Send OTP:

curl -s -X POST http://localhost:8080/otp/send -H "Content-Type: application/json" -H "x-ezauth-key: dev-secret" -d "{\"tenantId\":\"t1\",\"destination\":\"+15555550123\",\"channel\":\"sms\"}"




Verify OTP:

curl -s -X POST http://localhost:8080/otp/verify -H "Content-Type: application/json" -H "x-ezauth-key: dev-secret" -d "{\"tenantId\":\"t1\",\"requestId\":\"<requestId>\",\"code\":\"<otp>\"}"



Resend OTP (cooldown enforced):

curl -s -X POST http://localhost:8080/otp/resend ^
  -H "Content-Type: application/json" ^
  -H "x-ezauth-key: dev-secret" ^
  -d "{\"tenantId\":\"t1\",\"requestId\":\"<requestId>\"}"