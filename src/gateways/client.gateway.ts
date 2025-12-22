import { forEach } from 'lodash';
import { Server } from 'socket.io';

import { SocketNamespace } from '@/enums/socket-namespace.enum';
import { CustomSocket } from '@/interfaces/socket.interface';
import { OrdersService } from '@/services/order.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: false,
  },
  pingInterval: 1000,
  pingTimeout: 3000,
  namespace: SocketNamespace.CLIENT,
})
export class ClientGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly orderService: OrdersService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: CustomSocket) {
    const userId = client.handshake.currentUserId;
    const token = client.handshake.query.token;

    const currentOrder = await this.orderService.getOrdersByBuyer(userId);

    forEach(currentOrder, (order) => {
      client.join(order._id.toString());
    });

    client.join(token);
    client.join(userId);
  }

  async handleDisconnect(client: CustomSocket) {
    const token = client.handshake.query.token;
    client.leave(token as string);
  }
}
