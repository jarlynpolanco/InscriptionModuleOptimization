import { Component } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { Observable, of, forkJoin } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/auth';
import { auth } from 'firebase/app';
import { map, mergeMap } from 'rxjs/operators';
export interface Asignature {
  CurrentQuota: number;
  Days: string;
  Hours: string;
  MaxQuota: number;
  course: string;
  group: string;
  name: string;
};
export interface AsignatureId extends Asignature { id: string, doISelected: boolean };
export interface UserEnroll {
  email: string
};
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {

  //asignatures: Observable<Array<Asignature>>;

  private emailUserLoggedIn: string;
  private asignaturesCollection: AngularFirestoreCollection<Asignature>;
  asignatures: Observable<AsignatureId[]>;

  constructor(
    private afs: AngularFirestore,
    public afAuth: AngularFireAuth
  ) {
    if (afAuth.user) {
      this.afAuth.user.subscribe((user) => {
        this.emailUserLoggedIn = user.email;
        this.loadAsignatures();
      });
    }
  }


  renderHour = (asignature: Asignature, day: string): string => {
    const days = asignature.Days.split('|');
    const hours = asignature.Hours.split('|');
    if (!days.includes(day)) return 'N/A';
    return hours[days.findIndex(x => x == day)];
  }

  /*return this.afs.collection('asignatures/' + id + '/users').valueChanges().subscribe((users: UserEnroll[]) => {
              doISelected = typeof users.find(x => x['email'] === this.emailUserLoggedIn) !== 'undefined';

              return of({ id, ...data, doISelected });
            });*/

  loadAsignatures = (): void => {

    this.asignaturesCollection = this.afs.collection<Asignature>('asignatures');
    this.asignatures = this.asignaturesCollection.snapshotChanges()
      .pipe(
        mergeMap(actions => {
          const dt = actions.map(a => {
            const data = a.payload.doc.data() as Asignature;
            const id = a.payload.doc.id;
            return { id: id, data: data };
          });
          return of(dt);
        }),
        mergeMap(asig => forkJoin(asig.map(d => this.afs.collection('asignatures/' + d.id + '/users')
                                                    .valueChanges()
                                                    .pipe(
                                                      mergeMap((users: UserEnroll[]) => {
                                                        const doISelected = typeof users.find(x => x['email'] === this.emailUserLoggedIn) !== 'undefined';
                                                        return of({ id: d.id, ...d.data, doISelected: doISelected });
                                                      }
                                                    ))))));
this.asignatures.subscribe(t => console.log(t));
        // mergeMap(result =>  console.log(result));

       /*,
        mergeMap(data => )

          return this.afs.collection('asignatures/' + id + '/users').valueChanges().subscribe((users: UserEnroll[]) => {
              doISelected = typeof users.find(x => x['email'] === this.emailUserLoggedIn) !== 'undefined';

              return of({ id, ...data, doISelected });
            });*/
  }

  enrollAsignature = (asignature: AsignatureId): void => {
    console.log(asignature);
  }
  login() {
    this.afAuth.auth.signInWithPopup(new auth.GoogleAuthProvider()).then((data: firebase.auth.UserCredential) => {
      this.emailUserLoggedIn = data.user.email;
      this.loadAsignatures();
      console.log(data.user.email);
    });
  }
  logout() {
    this.afAuth.auth.signOut();
  }
}
