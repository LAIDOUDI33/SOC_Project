"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Demo credentials for testing
const DEMO_CREDENTIALS = [
  {
    email: "omar.hassani@soc.gov.dz",
    name: "Omar Hassani",
    role: "ADMIN",
    department: "SOC Management"
  },
  {
    email: "fatima.zerhouni@soc.gov.dz", 
    name: "Fatima Zerhouni",
    role: "SUPERVISOR",
    department: "Threat Intelligence Unit"
  },
  {
    email: "ahmed.benali@soc.gov.dz",
    name: "Ahmed Benali", 
    role: "ANALYST",
    department: "Incident Response Team"
  }
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Quick login with demo credentials
  const quickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("demo123456"); // Demo password
    handleLogin(demoEmail, "demo123456");
  };

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: loginEmail || email,
        password: loginPassword || password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 grid-pattern opacity-50" />
      
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl mb-4 shadow-lg shadow-emerald-500/25">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-white">National SOC</h1>
          <p className="text-sm text-emerald-400 mt-1">Algeria — Security Operations Center</p>
          <p className="text-xs text-slate-500 mt-2">Authentication Required</p>
        </div>

        {/* Login Card */}
        <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Sign In</CardTitle>
            <CardDescription className="text-slate-400">
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@soc.gov.dz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            {/* Sign In Button */}
            <Button 
              onClick={() => handleLogin()}
              disabled={isLoading || !email || !password}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.924 3 8.213l2.857-2.922z" />
                  </svg>
                  Authenticating...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-500">Demo Access</span>
              </div>
            </div>

            {/* Quick Login Buttons */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 text-center mb-3">Quick access for demonstration:</p>
              
              {DEMO_CREDENTIALS.map((demo) => (
                <Button
                  key={demo.email}
                  variant="outline"
                  className="w-full justify-start border-slate-700 hover:bg-slate-800 hover:border-slate-600"
                  onClick={() => quickLogin(demo.email)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-white">
                      {demo.name.charAt(0)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-white">{demo.name}</p>
                      <p className="text-xs text-slate-500">{demo.department}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${
                      demo.role === "ADMIN" ? "border-purple-500/50 text-purple-400" :
                      demo.role === "SUPERVISOR" ? "border-blue-500/50 text-blue-400" :
                      "border-green-500/50 text-green-400"
                    }`}>
                      {demo.role}
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-600">
            Secure Access • Open Source Stack v2.0 • Algeria National SOC
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="text-xs text-slate-700">🔒 TLS Encrypted</span>
            <span className="text-xs text-slate-700">✅ MFA Ready</span>
            <span className="text-xs text-slate-700">🇩🇿 Government Network</span>
          </div>
        </div>
      </div>
    </div>
  );
}
