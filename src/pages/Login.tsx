import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail, LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAppStore();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate login delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock login - in real app, this would be an API call
    const mockUsers = {
      'manufacturer@example.com': {
        id: '1',
        address: '0x1234567890123456789012345678901234567890' as const,
        role: 'MANUFACTURER' as const,
        displayName: 'John Manufacturing',
        email: 'manufacturer@example.com',
        company: 'ABC Manufacturing Co.'
      },
      'supplier@example.com': {
        id: '2',
        address: '0x2345678901234567890123456789012345678901' as const,
        role: 'SUPPLIER' as const,
        displayName: 'Sarah Supply Chain',
        email: 'supplier@example.com',
        company: 'XYZ Suppliers Ltd.'
      },
      'wholesaler@example.com': {
        id: '3',
        address: '0x3456789012345678901234567890123456789012' as const,
        role: 'WHOLESALER' as const,
        displayName: 'Mike Wholesale',
        email: 'wholesaler@example.com',
        company: 'Global Wholesale Inc.'
      }
    };

    const user = mockUsers[email as keyof typeof mockUsers];
    
    if (user && password === 'demo123') {
      setUser(user);
      toast({
        title: "Login successful!",
        description: `Welcome back, ${user.displayName}`,
      });
      navigate('/');
    } else {
      toast({
        title: "Login failed",
        description: "Invalid credentials. Try manufacturer@example.com / demo123",
        variant: "destructive"
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
            <LogIn className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your TrackChain account to continue
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-2">Demo Credentials:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• manufacturer@example.com / demo123</p>
                <p>• supplier@example.com / demo123</p>
                <p>• wholesaler@example.com / demo123</p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link 
                to="/register" 
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}