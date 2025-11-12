
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckIcon, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Organization, User, Subcontractor } from '@/types';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { getApiBaseUrl } from '@/lib/get-api-url';

interface LoginResponse {
  token: string;
  user: User;
  organization?: Organization;
  subcontractor?: Subcontractor | null;
  country?: User['country'] | null;
}


export default function RootPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordUp, setShowPasswordUp] = useState(false);
  const [showConfirmPasswordUp, setShowConfirmPasswordUp] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserData = localStorage.getItem('userData');

      if (storedUserData) {
        try {
          const userData = JSON.parse(storedUserData);
          if (userData && userData.isLoggedIn) {
            const userRole = userData.role;
            if (userRole === 'T' || userRole === 'O') {
              router.push('/towerco/home');
            } else if (userRole === 'SA' || userRole === 'SG') {
              router.push('/agency/home');
            }
          }
        } catch (error) {
          console.error("Failed to parse user data from localStorage", error);
          // Clear potentially corrupted data
          localStorage.removeItem('userData');
        }
      }
    }
  }, [router]);


  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    if (typeof window !== 'undefined') {
      console.log('Domain being read:', window.location.host);
    }

    try {
      if (!username || !password) {
        throw new Error('Email and password are required.');
      }

      const API_URL = `${getApiBaseUrl()}/users/auth/token/`;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed. Please check your credentials.');
      }
      
      const data: LoginResponse = await response.json();

      let orgForStorage: Partial<Organization> | null = null;
      if (data.organization) {
        orgForStorage = data.organization;
      } else if (data.subcontractor) {
        orgForStorage = {
            id: data.subcontractor.id,
            name: data.subcontractor.name,
            code: data.subcontractor.code,
            role: data.subcontractor.role,
            type: data.subcontractor.type,
            logo: data.subcontractor.logo,
            member: data.subcontractor.subcon_member
        };
      }
      
      const userDataToStore = {
          isLoggedIn: true,
          user: {
              token: data.token,
              country: data.country,
              organization: orgForStorage,
              subcontractor: data.subcontractor,
              user: data.user,
          },
          role: data.user.role,
          globalConsent: data.organization?.global_consent || false,
          hasUserProfile: data.user.has_user_profile,
          orgCode: orgForStorage?.code,
          token: data.token,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('userData', JSON.stringify(userDataToStore));
      }

      toast({
        title: 'Login Successful',
        description: `Welcome, ${data.user.first_name}! Redirecting...`,
      });

      const userRole = data.user.role;
      if (userRole === 'T' || userRole === 'O') {
        router.push('/towerco/home');
      } else if (userRole === 'SA' || userRole === 'SG') {
        router.push('/agency/home');
      } else {
        throw new Error('Unknown user role. Cannot redirect.');
      }

    } catch (error: any) {
       toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: error.message || 'An error occurred. Please try again.',
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="flex flex-col md:flex-row w-full max-w-5xl mx-auto rounded-xl shadow-2xl overflow-hidden">
        
        <div className="w-full md:w-2/5 bg-header text-header-foreground p-8 flex flex-col justify-between">
            <div className="flex-grow flex flex-col justify-center items-center text-center">
                <div className="flex items-center gap-3 mb-6">
                <div className="bg-white rounded-full p-2">
                    <svg
                        className="w-10 h-10 text-header"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                        opacity="0.3"
                        />
                        <path d="M12 4.5c-4.14 0-7.5 3.36-7.5 7.5s3.36 7.5 7.5 7.5 7.5-3.36 7.5-7.5-3.36-7.5-7.5-7.5zm0 2.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm0 10.5c-2.48 0-4.5-2.02-4.5-4.5s2.02-4.5 4.5-4.5 4.5 2.02 4.5 4.5-2.02 4.5-4.5-4.5z" />
                        <path d="M7 12.5c0-.64.13-1.25.36-1.82-.55-.25-1.18-.38-1.86-.38-1.66 0-3 1.34-3 3s1.34 3 3 3c.68 0-1.31-.13-1.86-.38C7.13 13.75 7 13.14 7 12.5zm10 0c0-.64-.13-1.25-.36-1.82.55-.25 1.18-.38 1.86-.38 1.66 0 3 1.34 3 3s-1.34 3-3 3c-.68 0-1.31-.13-1.86-.38.23-.57.36-1.18.36-1.82z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold">Secure Buddy</h1>
                </div>
                <h2 className="text-2xl font-bold mb-6">WHY SIGN UP?</h2>
                <ul className="space-y-4 text-lg inline-block">
                    <li className="flex items-center gap-3">
                        <CheckIcon className="w-6 h-6" />
                        <span className='font-medium'>Centralized Resource Management</span>
                    </li>
                    <li className="flex items-center gap-3">
                        <CheckIcon className="w-6 h-6" />
                        <span className='font-medium'>One Platform For All</span>
                    </li>
                </ul>
            </div>
            <div className="mt-auto text-center text-xs">
                <Link
                href="https://towerbuddy.tel/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-white text-blue-900 font-semibold py-2 px-4 rounded-md shadow-md hover:bg-gray-200 transition-colors"
                >
                i4sight technologies | All Rights Reserved
                </Link>
            </div>
        </div>

        <div className="w-full md:w-3/5 bg-card text-card-foreground">
          <div className="p-8 flex flex-col justify-between h-full">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin" className="data-[state=active]:bg-header data-[state=active]:text-header-foreground">SIGN IN</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-header data-[state=active]:text-header-foreground">SIGN UP</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="mt-8">
                <Card className="border-0 shadow-none">
                  <form onSubmit={handleSignIn}>
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
                      <CardDescription>
                        Enter your credentials to access your portal.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username-in">Email Address</Label>
                        <Input 
                          id="username-in" 
                          type="email" 
                          placeholder="Enter your email" 
                          required 
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password-in">Password</Label>
                        <div className="relative">
                          <Input 
                            id="password-in" 
                            type={showPassword ? 'text' : 'password'} 
                            placeholder="Enter your password"
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            className="pr-10"
                          />
                           <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                          >
                            {showPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                          </button>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" className="w-full bg-header hover:bg-header/90" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-8">
                 <Card className="border-0 shadow-none">
                  <CardHeader>
                      <CardTitle className="text-2xl font-bold">Sign Up</CardTitle>
                      <CardDescription>
                      Create an account to get started with Secure Buddy.
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-up">EMAIL ADDRESS <span className="text-destructive">*</span></Label>
                      <Input id="email-up" type="email" placeholder="Enter your email" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="firstname-up">FIRST NAME <span className="text-destructive">*</span></Label>
                      <Input id="firstname-up" type="text" placeholder="Enter your first name" required />
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="middlename-up">MIDDLE NAME</Label>
                      <Input id="middlename-up" type="text" placeholder="Enter your middle name" />
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="lastname-up">LAST NAME <span className="text-destructive">*</span></Label>
                      <Input id="lastname-up" type="text" placeholder="Enter your last name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role-up">PLATFORM ROLE <span className="text-destructive">*</span></Label>
                      <Select>
                          <SelectTrigger id="role-up">
                              <SelectValue placeholder="Choose an option" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="officer">Patrolling Officer</SelectItem>
                              <SelectItem value="guard">Security Guard</SelectItem>
                          </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-up">PASSWORD <span className="text-destructive">*</span></Label>
                       <div className="relative">
                          <Input id="password-up" type={showPasswordUp ? 'text' : 'password'} placeholder="Enter password" required className="pr-10"/>
                           <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                            onClick={() => setShowPasswordUp(!showPasswordUp)}
                          >
                            {showPasswordUp ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                          </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password-up">CONFIRM PASSWORD <span className="text-destructive">*</span></Label>
                       <div className="relative">
                          <Input id="confirm-password-up" type={showConfirmPasswordUp ? 'text' : 'password'} placeholder="Re-enter password" required className="pr-10"/>
                           <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                            onClick={() => setShowConfirmPasswordUp(!showConfirmPasswordUp)}
                          >
                            {showConfirmPasswordUp ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                          </button>
                        </div>
                    </div>
                    <div className="flex items-start space-x-2">
                        <Checkbox
                            id="terms"
                            checked={termsAccepted}
                            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <label
                                htmlFor="terms"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                I agree to the{' '}
                                <Link
                                href="https://towerbuddy.tel/terms-and-conditions"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-accent hover:underline text-sm"
                                >
                                Terms &amp; Conditions
                                </Link>
                            </label>
                        </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-header hover:bg-header/90 text-lg py-6" disabled={!termsAccepted}>Create Account &rarr;</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
