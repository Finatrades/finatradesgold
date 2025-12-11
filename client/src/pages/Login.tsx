import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, ArrowRight, Lock } from 'lucide-react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Link } from 'wouter';

export default function Login() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      
      // Check against mock DB
      const existingUsers = JSON.parse(localStorage.getItem('fina_users') || '[]');
      const user = existingUsers.find((u: any) => u.email === email && u.password === password);
      
      const isDemo = email === 'demo@finatrades.com' && password === 'password';
      const isAdmin = email === 'admin@finatrades.com' && password === 'admin123';

      if (isAdmin) {
        login({
          firstName: "Admin",
          lastName: "User",
          email: "admin@finatrades.com",
          accountType: "business",
          role: 'admin'
        });
        toast.success("Admin Login Successful");
      } else if (user || isDemo) {
        // Mock login logic
        login({
          firstName: user ? user.firstName : "Demo",
          lastName: user ? user.lastName : "User",
          email: email,
          accountType: user ? user.accountType : "personal",
          companyName: user ? user.companyName : undefined,
          role: 'user',
          kycStatus: user ? user.kycStatus : 'pending' // Demo starts pending
        });

        toast.success("Welcome back!", {
          description: "You have successfully logged in."
        });
      } else {
        toast.error("Invalid Credentials", {
          description: "Please check your email and password."
        });
      }
    }, 1000);
  };

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-24 bg-background flex items-center justify-center">
        <div className="container mx-auto px-6 max-w-md">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to access your FinaTrades dashboard.</p>
          </div>

          <Card className="p-8 bg-white border-border shadow-md backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-background border-input text-foreground" 
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password">
                    <span className="text-xs text-secondary hover:underline cursor-pointer font-medium">Forgot password?</span>
                  </Link>
                </div>
                <div className="relative">
                  <Input 
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="bg-background border-input text-foreground pr-10" 
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="remember" className="border-input data-[state=checked]:bg-secondary data-[state=checked]:border-secondary" />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                >
                  Remember me for 30 days
                </label>
              </div>

              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 h-12 text-lg font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all"
              >
                {isLoading ? "Signing in..." : (
                  <>Sign In <ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/register">
                <span className="text-secondary font-bold hover:underline cursor-pointer">Create Account</span>
              </Link>
            </div>
          </Card>
          
          <div className="mt-8 text-center text-xs text-muted-foreground">
            <p className="flex justify-center items-center gap-2">
              <Lock className="w-3 h-3" />
              Secured by FinaTrades Switzerland
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
