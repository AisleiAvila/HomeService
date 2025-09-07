// auth-fix.interceptor.ts
import { HttpInterceptorFn } from "@angular/common/http";

export const authFixInterceptor: HttpInterceptorFn = (req, next) => {
  console.log("AuthFixInterceptor - Intercepted request:", JSON.stringify(req));
  if (req.url.includes("/auth/v1/token?grant_type=password")) {
    console.log("AuthFixInterceptor - Modifying request for /auth/v1/token");
    const newUrl = req.url.replace("?grant_type=password", "");
    console.log("AuthFixInterceptor - New URL:", newUrl);
    const newReq = req.clone({
      url: newUrl,
      body: {
        ...(typeof req.body === "object" && req.body !== null ? req.body : {}),
        grant_type: "password",
      },
    });
    return next(newReq);
  }
  return next(req);
};
