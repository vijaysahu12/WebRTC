import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebrtcService {
  private pc?: RTCPeerConnection;
  private localStreamSubject = new BehaviorSubject<MediaStream | null>(null);
  private remoteStreamSubject = new BehaviorSubject<MediaStream | null>(null);

  localStream$ = this.localStreamSubject.asObservable();
  remoteStream$ = this.remoteStreamSubject.asObservable();

  constructor(private db: AngularFireDatabase) {}

  async initLocalStream() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    this.localStreamSubject.next(stream);
    return stream;
  }

  async createPeerConnection(roomId: string) {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.pc.ontrack = (event) => {
      this.remoteStreamSubject.next(event.streams[0]);
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate.toJSON();
        this.db.list(`rooms/${roomId}/candidates`).push(candidate);
      }
    };
  }

  async createOffer(roomId: string) {
    if (!this.pc) {
      await this.createPeerConnection(roomId);
    }
    const stream = await this.initLocalStream();
    stream.getTracks().forEach(track => this.pc!.addTrack(track, stream));

    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);
    await this.db.object(`rooms/${roomId}`).update({ offer: offer.toJSON() });
  }

  async createAnswer(roomId: string, offer: RTCSessionDescriptionInit) {
    if (!this.pc) {
      await this.createPeerConnection(roomId);
    }
    const stream = await this.initLocalStream();
    stream.getTracks().forEach(track => this.pc!.addTrack(track, stream));

    await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    await this.db.object(`rooms/${roomId}`).update({ answer: answer.toJSON() });
  }

  listenForOffer(roomId: string) {
    return this.db.object(`rooms/${roomId}/offer`).valueChanges();
  }

  listenForAnswer(roomId: string) {
    return this.db.object(`rooms/${roomId}/answer`).valueChanges();
  }

  listenForCandidates(roomId: string) {
    return this.db.list(`rooms/${roomId}/candidates`).valueChanges();
  }

  async setRemoteAnswer(answer: RTCSessionDescriptionInit) {
    await this.pc?.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    await this.pc?.addIceCandidate(new RTCIceCandidate(candidate));
  }

  close(roomId: string) {
    this.db.object(`rooms/${roomId}`).remove();
    this.pc?.close();
    this.localStreamSubject.next(null);
    this.remoteStreamSubject.next(null);
  }
}
