import { Component, HostListener, OnInit } from '@angular/core';
import { Message as StompMessage, StompSubscription } from '@stomp/stompjs';
import { Chat } from 'src/app/models/Chat';
import { Message } from 'src/app/models/Message';
import { User } from 'src/app/models/User';
import { ChatService } from 'src/app/services/chat.service';
import { RandomService } from 'src/app/services/random.service';
import { StompService } from 'src/app/services/stomp.service';
import { UnreadService } from 'src/app/services/unread.service';

@Component({
  selector: 'app-employee',
  templateUrl: './employee.component.html',
  styleUrls: ['./employee.component.scss'],
})
export class EmployeeComponent implements OnInit {
  public user: User = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@gmail.com',
    isCustomer: false,
  };

  private subscriptions: StompSubscription[] = [];

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any) {
    const confirmationMessage =
      'Êtes-vous sûr de vouloir quitter cette page ? Tous les messages seront perdus.';
    $event.returnValue = confirmationMessage;
    return confirmationMessage;
  }

  constructor(
    private randomService: RandomService,
    private stompService: StompService,
    private chatService: ChatService,
    private unreadService: UnreadService
  ) {}

  ngOnInit(): void {
    this.stompService.connect(this.user);

    this.stompService.subscribe(
      '/topic/employee',
      (stompMessage: StompMessage) => {
        this.handleMainSubscription(stompMessage);
      }
    );
  }

  private handleMainSubscription(stompMessage: StompMessage): void {
    const chat: Chat = JSON.parse(stompMessage.body);

    // Check if the chat is for this user
    if (chat.employee.email != this.user.email) {
      return;
    }

    if (chat.status === 'OPENED') {
      this.chatService.addToChats(chat);
      this.subscribeToChat(chat);
    } else if (chat.status === 'CLOSED') {
      this.unsubscribeFromChat(chat);
      this.chatService.removeFromChats(chat);
    }
  }

  private async subscribeToChat(chat: Chat): Promise<void> {
    const subscription = await this.stompService.subscribe(
      `/topic/chat/${chat.id}`,
      (stompMessage: StompMessage) => {
        const message: Message = JSON.parse(stompMessage.body);

        const mainChatId = this.chatService.getMainChatId();
        if (mainChatId === chat.id) {
          this.chatService.addMessageToMainChat(message);
        } else {
          this.chatService.addMessageToChat(chat.id, message);
          this.unreadService.incrementUnreadForChat(chat.id);
        }
      }
    );
    this.subscriptions.push(subscription);
  }

  // TODO: A REVOIR
  private unsubscribeFromChat(chat: Chat): void {
    const subscription = this.subscriptions.find(
      (s) => s.id === `/topic/chat/${chat.id}`
    );
    if (subscription) {
      this.stompService.unsubscribe(subscription);
    }
  }

  ngOnDestroy(): void {
    this.stompService.disconnect();
  }
}
