/**
 * National SOC Platform - Enterprise Login Component
 * 
 * Comprehensive login form supporting:
 * - Local database authentication
 * - LDAP/Active Directory (Djezzy corporate)
 * - SAML 2.0 SSO
 * - MFA verification
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Lock, 
  Building2, 
  Globe, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  ArrowRight,
  KeyRound,
  User,
  Mail,
  Eye,
  EyeOff,
  Smartphone,
  QrCode
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface LoginFormData {
  email: string;
  username: string;
  password: string;
}

interface AuthMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

interface LoginResponse {
  success: boolean;
  user?: any;
  tokens?: any;
  requiresMfa?: boolean;
  error?: string;
  errorCode?: string;
  warning?: string;
  authMethod?: string;
  redirectUrl?: string;
}

interface SSOInitResponse {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

// ============================================================
// COMPONENT
// ============================================================

export function LoginForm() {
  // State
  const [activeTab, setActiveTab] = useState<string>('local');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    username: '',
    password: '',
  });
  
  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaUserId, setMfaUserId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  
  // Available auth methods
  const [authMethods, setAuthMethods] = useState<AuthMethod[]>([]);

  // Fetch available auth methods on mount
  useEffect(() => {
    fetchAuthMethods();
  }, []);

  const fetchAuthMethods = async () => {
    try {
      const response = await fetch('/api/auth?action=methods');
      const data = await response.json();
      
      if (data.success) {
        setAuthMethods(data.methods.map((method: any) => ({
          ...method,
          icon: getMethodIcon(method.id),
        })));
        
        // Set default tab to first available method
        if (data.methods.length > 0) {
          setActiveTab(data.methods[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch auth methods:', err);
      // Default to local if API fails
      setAuthMethods([
        { id: 'local', name: 'Local Account', description: 'Email and password', icon: <Lock className="h-4 w-4" />, enabled: true },
      ]);
    }
  };

  const getMethodIcon = (methodId: string): React.ReactNode => {
    switch (methodId) {
      case 'ldap':
        return <Building2 className="h-4 w-4" />;
      case 'saml':
        return <Globe className="h-4 w-4" />;
      case 'local':
      default:
        return <Lock className="h-4 w-4" />;
    }
  };

  // Handle form input changes
  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Local login handler
  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: formData.email || formData.username,
          password: formData.password,
        }),
      });

      const data: LoginResponse = await response.json();

      if (data.success && !data.requiresMfa) {
        handleSuccessfulLogin(data);
      } else if (data.requiresMfa) {
        setMfaRequired(true);
        setSuccess('Login successful! Please verify with MFA.');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // LDAP/AD login handler
  const handleLDAPLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ldap-login',
          username: formData.username,
          password: formData.password,
        }),
      });

      const data: LoginResponse = await response.json();

      if (data.success) {
        if (data.warning) {
          setWarning(data.warning);
        }
        handleSuccessfulLogin(data);
      } else {
        setError(data.error || 'LDAP authentication failed');
      }
    } catch (err) {
      setError('LDAP service unavailable. Please try local login or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  // SAML SSO handler
  const handleSSOLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sso-init',
          relayState: window.location.origin + '/dashboard',
        }),
      });

      const data: SSOInitResponse = await response.json();

      if (data.success && data.redirectUrl) {
        // Redirect to IdP for SSO
        window.location.href = data.redirectUrl;
      } else {
        setError(data.error || 'SSO initialization failed');
        setIsLoading(false);
      }
    } catch (err) {
      setError('SSO service unavailable. Please try another method.');
      setIsLoading(false);
    }
  };

  // MFA verification handler
  const handleMFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // In a real implementation, this would call the MFA verify endpoint
      // For now, simulate MFA verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (mfaCode.length === 6) {
        setSuccess('MFA verified! Redirecting...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        setError('Invalid verification code');
      }
    } catch (err) {
      setError('MFA verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle successful login
  const handleSuccessfulLogin = (data: LoginResponse) => {
    if (data.tokens) {
      // Store tokens in localStorage (or httpOnly cookies in production)
      localStorage.setItem('soc_access_token', data.tokens.accessToken);
      localStorage.setItem('soc_refresh_token', data.tokens.refreshToken);
      localStorage.setItem('soc_token_expires', data.tokens.expiresAt);
      localStorage.setItem('soc_user_data', JSON.stringify(data.user));
      localStorage.setItem('soc_auth_method', data.authMethod || 'local');
    }

    setSuccess(`Welcome${data.user?.name ? `, ${data.user.name}` : ''}! Redirecting...`);
    
    // Redirect after short delay
    setTimeout(() => {
      window.location.href = data.redirectUrl || '/dashboard';
    }, 1000);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">National SOC Platform</h1>
        <p className="text-muted-foreground mt-2">Djezzy Security Operations Center</p>
      </div>

      {/* Main Login Card */}
      <Card>
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Choose your authentication method below
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Warning Alert */}
          {warning && (
            <Alert className="mb-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-200">Warning</AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-300">{warning}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-200">Success</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">{success}</AlertDescription>
            </Alert>
          )}

          {/* Auth Method Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="local" className="gap-1.5 text-xs sm:text-sm">
                <Lock className="h-3.5 w-3.5 hidden sm:block" />
                Local
              </TabsTrigger>
              <TabsTrigger value="ldap" className="gap-1.5 text-xs sm:text-sm">
                <Building2 className="h-3.5 w-3.5 hidden sm:block" />
                AD/LDAP
              </TabsTrigger>
              <TabsTrigger value="saml" className="gap-1.5 text-xs sm:text-sm">
                <Globe className="h-3.5 w-3.5 hidden sm:block" />
                SSO
              </TabsTrigger>
            </TabsList>

            {/* Local Authentication Tab */}
            <TabsContent value="local" className="space-y-4 mt-6">
              <form onSubmit={handleLocalLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email or Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="text"
                      placeholder="Enter your email or username"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="pl-10 pr-10"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground">
                <p>Use your SOC platform account credentials</p>
              </div>
            </TabsContent>

            {/* LDAP/AD Authentication Tab */}
            <TabsContent value="ldap" className="space-y-4 mt-6">
              <form onSubmit={handleLDAPLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ldap-username">Domain Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="ldap-username"
                      type="text"
                      placeholder="e.g., jsmith or DJEZZY\jsmith"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ldap-password">Domain Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="ldap-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your domain password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="pl-10 pr-10"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Building2 className="mr-2 h-4 w-4" />
                      Sign in with AD
                    </>
                  )}
                </Button>
              </form>

              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Corporate Active Directory
                </p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  Use your Djezzy domain credentials. Your account will be synchronized automatically.
                </p>
              </div>
            </TabsContent>

            {/* SAML SSO Tab */}
            <TabsContent value="saml" className="space-y-4 mt-6">
              <div className="text-center space-y-4 py-8">
                <div className="flex justify-center">
                  <Globe className="h-12 w-12 text-primary" />
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg">Single Sign-On</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Authenticate using your corporate identity provider
                  </p>
                </div>

                <Button 
                  onClick={handleSSOLogin} 
                  size="lg"
                  disabled={isLoading}
                  className="gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting to IdP...
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4" />
                      Continue with SSO
                    </>
                  )}
                </Button>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>You will be redirected to:</p>
                  <Badge variant="outline" className="text-xs">
                    Djezzy ADFS / Azure AD
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="text-sm space-y-2">
                <p className="font-medium">Supported Identity Providers:</p>
                <ul className="space-y-1 text-muted-foreground ml-4 list-disc">
                  <li>Djezzy Corporate ADFS</li>
                  <li>Microsoft Azure AD</li>
                  <li>ARTP Government Portal (coming soon)</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>

          {/* MFA Verification (shown when required) */}
          {mfaRequired && (
            <div className="mt-6 border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Two-Factor Authentication</h3>
              </div>
              
              <form onSubmit={handleMFAVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mfa-code">Verification Code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="mfa-code"
                      type="text"
                      placeholder="000000"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="pl-10 text-center tracking-widest font-mono text-lg"
                      maxLength={6}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || mfaCode.length !== 6}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Verify & Continue
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-col gap-4">
          <Separator className="w-full" />
          
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>
              By signing in, you agree to our{' '}
              <a href="#" className="underline hover:text-foreground">Terms of Service</a>{' '}
              and{' '}
              <a href="#" className="underline hover:text-foreground">Privacy Policy</a>.
            </p>
            <p>
              Need help? Contact{' '}
              <a href="mailto:soc-support@djezzy.dz" className="underline hover:text-foreground">
                SOC Support
              </a>
            </p>
          </div>

          <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
            <span>v2.0.0</span>
            <span>Djezzy © {new Date().getFullYear()}</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default LoginForm;
