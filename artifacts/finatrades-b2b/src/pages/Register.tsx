import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useB2bRegister, B2BRegisterInputRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: B2BRegisterInputRole.exporter,
    phone: "",
    companyName: ""
  });
  
  const [, setLocation] = useLocation();
  const registerMutation = useB2bRegister();
  const { toast } = useToast();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(
      { data: formData },
      {
        onSuccess: () => {
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          toast({
            title: "Registration failed",
            description: err.message || "An error occurred",
            variant: "destructive",
          });
        }
      }
    );
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-12">
      <Card className="w-full max-w-lg bg-card border-border">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-primary font-bold tracking-tight">Apply for Access</CardTitle>
          <CardDescription>Join the Pan-African Institutional Trading Network</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Institution Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={(val) => updateField("role", val as B2BRegisterInputRole)}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={B2BRegisterInputRole.exporter}>Exporter</SelectItem>
                  <SelectItem value={B2BRegisterInputRole.importer}>Importer</SelectItem>
                  <SelectItem value={B2BRegisterInputRole.government}>Government Entity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  required
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  required
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company / Entity Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                required
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Work Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
                className="bg-input border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
                className="bg-input border-border"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Submitting Application..." : "Submit Application"}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Already have an account? <Link href="/login" className="text-accent hover:underline">Sign In</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
