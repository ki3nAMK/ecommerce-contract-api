import { User } from '@/models/entities/user.entity';
import { Session } from 'inspector/promises';
import { Socket } from 'socket.io';
import { Handshake } from 'socket.io/dist/socket-types';

export type CustomSocket = Socket & {
  handshake: Handshake & {
    token: string;
    currentSession: Session;
    currentUser: User;
    currentSessionId: string;
    currentUserId: string;
  };
};
