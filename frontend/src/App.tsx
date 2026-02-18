import { useState, useEffect, useRef } from "react"
import Draggable from "react-draggable"
import { supabase } from "@/lib/supabase"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isConnected, setIsConnected] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false) // New state for Password Reset
  const socketRef = useRef<WebSocket | null>(null)
  const nodeRef = useRef(null);

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  /* ---------------- Auth Session & Recovery Logic ---------------- */

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      
      // CRITICAL: Detect if the user clicked a "Reset Password" link
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovering(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  /* ---------------- Auth Handlers ---------------- */

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    })
  }

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
  }

  const handleSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else if (!data.session) alert("Check your email for confirmation.")
  }

  const handleResetRequest = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) alert(error.message)
    else alert("Password reset email sent!")
  }

  const handleUpdatePassword = async () => {
    const { error } = await supabase.auth.updateUser({ password: password })
    if (error) {
      alert(error.message)
    } else {
      alert("Password updated successfully!")
      setIsRecovering(false) // Return to normal view
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsRecovering(false)
  }

  /* ---------------- WebSocket ---------------- */

  useEffect(() => {
    if (!session?.access_token || isRecovering) return;

    const socket = new WebSocket(
      `ws://127.0.0.1:8787/ws?token=${session.access_token}&email=${session.user?.email}`
    );
    
    socketRef.current = socket;
    socket.onopen = () => setIsConnected(true);
    socket.onclose = () => setIsConnected(false);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "move" || data.type === "init") {
          setPosition({ x: data.x, y: data.y });
        }
      } catch (err) { console.error("Sync error:", err); }
    };

    return () => socket.close();
  }, [session?.access_token, isRecovering]); 

  const handleDrag = (_e: any, data: { x: number; y: number }) => {
    const newPos = { x: data.x, y: data.y };
    setPosition(newPos);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "move", ...newPos }));
    }
  };

  /* ================= UI RENDERING ================= */

  // Show Auth Screen if not logged in OR if in Password Recovery mode
  if (!session || isRecovering) {
    return (
      <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#00aeef] opacity-20 blur-[100px] rounded-full" />
        <Card className="relative w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl z-10">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl text-white font-black tracking-tighter">
              {isRecovering ? "New Password" : "SyncBoard"}
            </CardTitle>
            <CardDescription className="text-slate-300">
              {isRecovering ? "Secure your account" : "Real-time collaborative canvas"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isRecovering ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs ml-1">New Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 text-white h-11"
                    placeholder="••••••••"
                  />
                </div>
                <Button onClick={handleUpdatePassword} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold h-12">
                  Update Password
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-white/5 p-1 rounded-xl mb-6">
                  <TabsTrigger value="signin" className="text-white">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="text-white">Sign Up</TabsTrigger>
                  <TabsTrigger value="reset" className="text-white">Reset</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="space-y-4">
                  <Button onClick={handleGoogleLogin} className="w-full bg-white text-black font-bold h-11">Continue with Google</Button>
                  <div className="flex items-center gap-4 py-2"><div className="flex-1 h-px bg-white/10" /><span className="text-[10px] text-slate-500">OR</span><div className="flex-1 h-px bg-white/10" /></div>
                  <Input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                  <Input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                  <Button onClick={handleSignIn} className="w-full bg-[#00aeef] text-white font-bold h-12">Sign In</Button>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  <Input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                  <Input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                  <Button onClick={handleSignUp} className="w-full bg-[#00aeef] text-white font-bold h-12">Create Account</Button>
                </TabsContent>

                <TabsContent value="reset" className="space-y-4">
                  <Input type="email" placeholder="Email address" onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                  <Button onClick={handleResetRequest} className="w-full bg-[#00aeef] text-white font-bold h-12">Send Reset Link</Button>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
          <CardFooter className="text-center text-[10px] text-slate-500 pb-6 flex justify-center uppercase font-bold">
            © {new Date().getFullYear()} SyncBoard System
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-white relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]">
      <div className="absolute top-6 left-6 flex gap-3 items-center z-50">
        <Badge className={`px-4 py-1.5 border-none ${isConnected ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
          {isConnected ? "Live Sync" : "Connecting..."}
        </Badge>
        <Button variant="outline" onClick={handleLogout} className="rounded-full text-xs font-bold">Logout</Button>
        <span className="text-sm font-medium text-slate-700">{session?.user?.email}</span>
      </div>

      <Draggable nodeRef={nodeRef} position={position} onDrag={handleDrag}>
        <div ref={nodeRef} className="w-32 h-32 bg-[#00aeef] rounded-3xl cursor-move shadow-xl flex flex-col items-center justify-center text-white font-black absolute">
          <span className="text-lg">BOX</span>
        </div>
      </Draggable>
    </div>
  )
}