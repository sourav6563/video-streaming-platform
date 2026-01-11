import { Schema, model, Types, Model } from "mongoose";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface User {
  _id: Types.ObjectId;
  username: string;
  email: string;
  name: string;
  profileImage?: string;
  password: string;
  watchHistory?: Types.ObjectId[];
  refreshToken?: string;
  isVerified?: boolean;
  emailVerificationCode?: string;
  emailVerificationExpires?: Date;
  passwordResetCode?: string;
  passwordResetExpires?: Date;
}

export interface UserMethods {
  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

// Create a type that combines User interface with UserMethods
type UserModel = Model<User, object, UserMethods>;

const userSchema = new Schema<User, UserModel, UserMethods>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    profileImage: String,
    password: {
      type: String,
      required: true,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    refreshToken: String,
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationCode: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
    passwordResetCode: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = function (password: string) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRY as SignOptions["expiresIn"],
    },
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ _id: this._id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as SignOptions["expiresIn"],
  });
};

export const userModel = model<User, UserModel>("User", userSchema);
