export enum UserLevel {
  Admin = 0,
  Guest = 1,
}

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthUserDto = {
  id: string;
  fullName: string;
  email: string;
  level: UserLevel;
};

export type AuthSessionDto = {
  user: AuthUserDto;
  expiresAt: string;
};

export type LogoutDto = {
  success: boolean;
};
