import type { AuthUserDto, UserLevel } from "./auth";

export type CreateUserInput = {
  fullName: string;
  email: string;
  phoneNumber: string | null;
  level: UserLevel;
  password?: string;
};

export type UserDto = AuthUserDto & { phoneNumber: string | null };
