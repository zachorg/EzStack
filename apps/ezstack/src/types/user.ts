export interface ProjectDescriptor
{
    id: string;
    name: string;
    created_at: Date;
    updated_at: Date;
}

export interface CreateProjectDescriptor
{
    name: string;
}

export interface UserProfileDescriptor {
  id: string;
  email: string;
  status: "active" | "inactive";

  projects: string[];

  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}