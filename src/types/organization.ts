

export type Organization = {
  id: number;
  name: string;
  code: string | number; // Can be string (subcon_id) or number (org code)
  role: string;
  type: string;
  logo: string | null;
  global_consent?: boolean;
  subscribed_modules?: string[];
  member: {
    id: number;
    employee_id: string | null;
    designation: string;
    profile_picture?: string;
    phone?: string;
    can_consent?: boolean;
  };
};

export type Subcontractor = {
    id: number;
    name: string;
    subcon_id: string;
    code: number;
    role: string;
    type: string;
    logo: string | null;
    subcon_member: {
        id: number;
        employee_id: string;
        designation: string;
        profile_picture: string;
        phone: string;
    }
};
