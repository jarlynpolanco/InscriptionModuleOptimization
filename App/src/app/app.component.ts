import { Component } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/auth';
import { auth } from 'firebase/app';
import { map } from 'rxjs/operators';
export interface Asignature {
  CurrentQuota: number;
  Days: string;
  Hours: string;
  MaxQuota: number;
  course: string;
  group: string;
  name: string;
  users: string;
  usersRequesting: string;
  doISelected: boolean;
  doIRequested: boolean;
  credits: number;
};
export interface AsignatureId extends Asignature { id: string };
export interface UserEnroll {
  email: string
};
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {

  private emailUserLoggedIn: string;
  private asignaturesCollection: AngularFirestoreCollection<Asignature>;
  asignatures: Observable<AsignatureId[]>;

  constructor(
    private afs: AngularFirestore,
    public afAuth: AngularFireAuth
  ) {
    if (afAuth.user) {
      this.afAuth.user.subscribe((user) => {
        if (user !== null) {
          this.emailUserLoggedIn = user.email;
          this.loadAsignatures();
        }
      });
    }
  }
  renderCalendar = (asignature: Asignature): string => {
    const days = asignature.Days.split('|');
    const hours = asignature.Hours.split('|');
    let result = '';
    days.forEach((day, idx) => {
      result += day + ' ' + hours[idx] + '<br>';
    });
    return result;
  }
  request() {

  }
  renderHour = (asignature: Asignature, day: string): string => {
    const days = asignature.Days.split('|');
    const hours = asignature.Hours.split('|');
    if (!days.includes(day)) return '';
    return hours[days.findIndex(x => x == day)];
  }

  loadAsignatures = (): void => {

    this.asignaturesCollection = this.afs.collection<Asignature>('asignatures');

    this.asignatures = this.asignaturesCollection.snapshotChanges()
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as AsignatureId;
          const id = a.payload.doc.id;
          const doISelected = data.users.split('|').includes(this.emailUserLoggedIn);
          const doIRequested = data.usersRequesting.split('|').includes(this.emailUserLoggedIn);
          return { id, ...data, doISelected, doIRequested };
        }))
      );
  }
  unrollAsignature = (asignature: AsignatureId): void => {
    const asignatureDoc: AngularFirestoreDocument<Asignature> = this.afs.doc<Asignature>('asignatures/' + asignature.id);
    if (asignature.users.includes("|")) {
      const usersEnrolled = asignature.users.split('|');
      const indexToBeRemoved = usersEnrolled.findIndex(x => x === this.emailUserLoggedIn);
      usersEnrolled.splice(indexToBeRemoved, 1);
      asignature.users = usersEnrolled.length > 1 ? usersEnrolled.join("|") : usersEnrolled[0];
    } else {
      asignature.users = "";
    }

    asignature.CurrentQuota--;
    asignatureDoc.update(asignature);
  }
  enrollAsignature = (asignature: AsignatureId): void => {
    const asignatureDoc: AngularFirestoreDocument<Asignature> = this.afs.doc<Asignature>('asignatures/' + asignature.id);
    let usersEnrolled = asignature.users !== "" ? asignature.users.split('|') : [];
    usersEnrolled = [...usersEnrolled, this.emailUserLoggedIn];
    asignature.users = usersEnrolled.length > 1 ? usersEnrolled.join("|") : usersEnrolled[0];
    asignature.CurrentQuota++;
    asignatureDoc.update(asignature);
  }
  login() {
    this.afAuth.auth.signInWithPopup(new auth.GoogleAuthProvider()).then((data: firebase.auth.UserCredential) => {
      this.emailUserLoggedIn = data.user.email;
      this.loadAsignatures();
    });
  }
  logout() {
    this.afAuth.auth.signOut();
  }
}
