import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { IUser } from '../user/user.interface';
import { User } from '../user/user.model';
import config from '../../../config';
import { jwtHelpers } from '../../../helpers/jwtHelpers';
import { Secret } from 'jsonwebtoken';
import {
  ILogin,
  ILoginResponse,
  IRefreshTokenResponse,
} from './auth.Interface';

const createUser = async (user: IUser): Promise<ILoginResponse> => {
  // checking is user buyer
  try {
    const newUser = await User.create(user);
    // eslint-disable-next-line no-unused-vars
    const { password, createAt, updatedAt, _id, email, name } =
      newUser.toObject();

    //create access token & refresh token
    const accessToken = jwtHelpers.createToken(
      { _id, email },
      config.jwt.secret as Secret,
      config.jwt.expires_in as string
    );

    const refreshToken = jwtHelpers.createToken(
      { _id, email },
      config.jwt.refresh_secret as Secret,
      config.jwt.refresh_expires_in as string
    );

    return {
      user: { email, _id, name },
      accessToken,
      refreshToken,
    };
  } catch (err) {
    console.log(err);
    throw new ApiError(httpStatus.BAD_REQUEST, 'User Already exits ');
  }
  // eslint-disable-next-line no-unused-vars
};

const loginUser = async (payload: ILogin): Promise<ILoginResponse> => {
  const { email: givenEmail, password } = payload;

  const isUserExist = await User.isUserExist(givenEmail);

  if (!isUserExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User does not exist');
  }

  if (
    isUserExist.password &&
    !(await User.isPasswordMatched(password, isUserExist.password))
  ) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password is incorrect');
  }

  //create access token & refresh token

  const { email, _id, name } = isUserExist;
  const accessToken = jwtHelpers.createToken(
    { _id, email },
    config.jwt.secret as Secret,
    config.jwt.expires_in as string
  );

  const refreshToken = jwtHelpers.createToken(
    { _id, email },
    config.jwt.refresh_secret as Secret,
    config.jwt.refresh_expires_in as string
  );

  return {
    user: { email, _id, name },
    accessToken,
    refreshToken,
  };
};

const refreshToken = async (token: string): Promise<IRefreshTokenResponse> => {
  //verify token
  // invalid token - synchronous
  let verifiedToken = null;
  try {
    verifiedToken = jwtHelpers.verifyToken(
      token,
      config.jwt.refresh_secret as Secret
    );
  } catch (err) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Invalid Refresh Token');
  }

  const { _id } = verifiedToken;
  // checking deleted user's refresh token

  const isUserExist = await User.findById(_id);
  if (!isUserExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User does not exist');
  }
  //generate new Access token

  const newAccessToken = jwtHelpers.createToken(
    {
      _id: isUserExist._id,
      email: isUserExist.email,
    },
    config.jwt.secret as Secret,
    config.jwt.expires_in as string
  );

  return {
    accessToken: newAccessToken,
  };
};

export const AuthService = {
  createUser,
  loginUser,
  refreshToken,
};
