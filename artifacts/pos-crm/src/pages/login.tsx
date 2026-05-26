import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { username, password } },
      {
        onSuccess: (data) => {
          login(data.user, data.token);
          const role = data.user.role as string;
          if (role === "owner") {
            setLocation("/owner/dashboard");
          } else if (role === "waiter") {
            setLocation("/waiter/tables");
          } else {
            setLocation("/admin/dashboard");
          }
        },
        onError: () => {
          toast({
            title: "Xatolik",
            description: "Foydalanuvchi nomi yoki parol noto'g'ri",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle className="text-muted-foreground" />
      </div>
      <Card className="w-full max-w-md bg-card border-border text-foreground shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xl">
              R
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">RestoCRM</CardTitle>
          <CardDescription className="text-muted-foreground">
            Tizimga kirish uchun ma'lumotlaringizni kiriting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">Foydalanuvchi nomi</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Parol</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Kirish..." : "Kirish"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
