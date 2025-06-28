import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VideoChatComponent } from './video-chat/video-chat';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, VideoChatComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'WebRTC';
}
