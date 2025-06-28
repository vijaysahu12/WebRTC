import { Component, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebrtcService } from '../services/webrtc.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'video-chat',
  standalone: true,
  imports: [NgIf, FormsModule],
  templateUrl: './video-chat.html',
  styleUrl: './video-chat.css'
})
export class VideoChatComponent implements OnDestroy {
  roomId = '';
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  private subs: Subscription[] = [];

  constructor(private rtc: WebrtcService) {
    this.subs.push(this.rtc.localStream$.subscribe(stream => this.localStream = stream || undefined));
    this.subs.push(this.rtc.remoteStream$.subscribe(stream => this.remoteStream = stream || undefined));
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  async startCall() {
    await this.rtc.createOffer(this.roomId);
    this.subs.push(this.rtc.listenForAnswer(this.roomId).subscribe(ans => {
      if (ans) {
        this.rtc.setRemoteAnswer(ans as RTCSessionDescriptionInit);
      }
    }));
    this.subs.push(this.rtc.listenForCandidates(this.roomId).subscribe(list => {
      list.forEach(c => this.rtc.addIceCandidate(c as RTCIceCandidateInit));
    }));
  }

  async joinCall() {
    this.subs.push(this.rtc.listenForOffer(this.roomId).subscribe(async off => {
      if (off) {
        await this.rtc.createAnswer(this.roomId, off as RTCSessionDescriptionInit);
      }
    }));
    this.subs.push(this.rtc.listenForCandidates(this.roomId).subscribe(list => {
      list.forEach(c => this.rtc.addIceCandidate(c as RTCIceCandidateInit));
    }));
  }

  hangUp() {
    this.rtc.close(this.roomId);
    this.roomId = '';
  }
}
