/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { readFileSync } from 'fs';
import * as joi from 'joi';
import { load } from 'js-yaml';

export interface Configuration {
  port: number;
  isProd: boolean;
  prefix: string;
  version: string;
  grpcUrl: string;

  frontendUrl: string;
  verificationPath: {
    register: string;
    resetPassword: string;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    database: number;
    prefix: string;
  };
  agenda: {
    uri: string;
    collection: string;
    database: string;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    from: string;
  };
  verificationExpiresIn: {
    register: number;
    resetPassword: number;
  };
  jwt: {
    accessTokenExpiresIn: number;
    refreshTokenExpiresIn: number;
  };
  mongo: {
    uri: string;
    username: string;
    password: string;
    port: number;
  };
  redisLock: {
    driftFactor: number;
    retryJitter: number;
    retryCount: number;
    retryDelay: number;
  };
  verification: {
    enable_default_code: boolean;
    length: {
      code: number;
      token: number;
    };
    limit_time: number;
    register: {
      expires_in: number;
      path: string;
    };
    reset_password: {
      expires_in: number;
      path: string;
    };
  };
  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    s3: {
      bucket: string;
      url: string;
    };
    ses: {
      from: string;
    };
  };
  rabbitmq: {
    host: string;
    port: number;
    username: string;
    password: string;
  };
  server: {
    masterKey: string;
  };
  dify: {
    apiKey: string;
    url: string;
  };
  publicUrl: string;
  blockchain: {
    rpcUrl: string;
    adminPrivateKey: string;
    erc1155Address: string;
    escrowAddress: string;
    airdropAddress: string;
  };
}

const redisLockSchema = joi.object({
  driftFactor: joi.number().required(),
  retryJitter: joi.number().required(),
  retryCount: joi.number().required(),
  retryDelay: joi.number().required(),
});

const redisSchema = joi.object({
  host: joi.string().required(),
  port: joi.number().required(),
  password: joi.string().required().allow(''),
  database: joi.number().required(),
  prefix: joi.string().required(),
});

const verificationExpiresInSchema = joi.object({
  register: joi.number().required(),
  resetPassword: joi.number().required(),
});

const jwtSchema = joi.object({
  accessTokenExpiresIn: joi.number().required(),
  refreshTokenExpiresIn: joi.number().required(),
});

const verificationPathSchema = joi.object({
  register: joi.string().required(),
  resetPassword: joi.string().required(),
});

const mongoSchema = joi.object({
  uri: joi.string().required(),
  username: joi.string().required(),
  password: joi.string().required(),
  port: joi.number().required(),
  database: joi.string().required(),
});

const serverSchema = joi.object({
  masterKey: joi.string().required(),
});

const blockchainSchema = joi.object({
  rpcUrl: joi.string().required(),
  adminPrivateKey: joi.string().required(),
  erc1155Address: joi.string().required(),
  escrowAddress: joi.string().required(),
  airdropAddress: joi.string().required(),
});

const configSchema = joi.object<Configuration>({
  port: joi.number().required(),
  isProd: joi.boolean().required(),
  prefix: joi.string().required(),
  version: joi.string().required(),
  publicUrl: joi.string().required(),

  verificationPath: verificationPathSchema.required(),

  redis: redisSchema.required(),
  verificationExpiresIn: verificationExpiresInSchema.required(),
  jwt: jwtSchema.required(),
  mongo: mongoSchema.required(),
  redisLock: redisLockSchema.required(),
  server: serverSchema.required(),
  blockchain: blockchainSchema.required(),
});

export const loadConfiguration = (): Configuration => {
  const config = load(readFileSync('config.yml', 'utf8')) as Record<
    string,
    any
  >;

  const { value, error } = configSchema.validate(config, { abortEarly: true });

  if (error) {
    throw new Error(error.message);
  }

  return value;
};
