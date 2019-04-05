import { Component } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable, Subscription } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/auth';
import { auth } from 'firebase/app';
import { map } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { FilterSelectionPipe, SumCreditsPipe } from './pipes/filterSelection.pipe';
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

  private maxCredits: number = 25;
  private emailUserLoggedIn: string;
  private asignaturesSubscription: Subscription;
  private asignaturesCollection: AngularFirestoreCollection<Asignature>;
  asignatures: Observable<AsignatureId[]>;
  asignaturesArr: AsignatureId[];

  constructor(
    private afs: AngularFirestore,
    public afAuth: AngularFireAuth,
    public toast: ToastrService
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

  renderHour = (asignature: Asignature, day: string): string => {
    const days = asignature.Days.split('|');
    const hours = asignature.Hours.split('|');
    if (!days.includes(day)) return '';
    return hours[days.findIndex(x => x == day)];
  }

  getAsignaturesSnapshot() {
    return this.asignaturesCollection.snapshotChanges()
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

  loadAsignatures = (): void => {
    this.asignaturesCollection = this.afs.collection<Asignature>('asignatures');
    this.asignatures = this.getAsignaturesSnapshot();
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
    this.toast.info(`La asignatura ${asignature.name} fue eliminada`);
  }
  intersectTime(x1, x2, y1, y2) {
    return x1 < y2 && y1 < x2;
  }
  Intersection(array1: any[], array2: any[]): any[] {
    let result: any[] = [];
    let dict: {} = {};
    for (let el of array1) {
      if (!(el in dict)) {
        dict[el] = 1;
      }
    }

    for (let el of array2) {
      if (el in dict && result.indexOf(el) === -1) {
        result.push(el);
      }
    }
    return result;
  };
  CanITakeMoreCredits = (asignatureBeingSelected: AsignatureId): Promise<any> => {
    return new Promise((resolve, reject) => {
      this.asignaturesSubscription = this.getAsignaturesSnapshot().subscribe((data) => {
        const totalCurrentCredits = new SumCreditsPipe().transform(new FilterSelectionPipe().transform(data));
        if ((asignatureBeingSelected.credits + totalCurrentCredits) <= this.maxCredits) {
          resolve();
        }
        reject();
      });
    });
  }
  AsignaturesDontCollide = (asignatureBeingSelected: AsignatureId): Promise<any> => {
    return new Promise((resolve, reject) => {
      this.asignaturesSubscription = this.getAsignaturesSnapshot().subscribe((data) => {
        const daysAsignatureBeingSelected = asignatureBeingSelected.Days.split('|');
        const hoursAsignatureBeingSelected = asignatureBeingSelected.Hours.split('|');
        const myAsignatures = new FilterSelectionPipe().transform(data);

        myAsignatures.forEach((myAsignature) => {
          const days = myAsignature.Days.split('|');
          const hours = myAsignature.Hours.split('|');
          const DaysIntersecting = this.Intersection(daysAsignatureBeingSelected, days);
          if (DaysIntersecting.length > 0) {
            DaysIntersecting.forEach((dayInsertected) => {
              const hourByDayIntersected: string = hours[days.findIndex(x => x == dayInsertected)];
              const hourBeingSelectedByDay = hoursAsignatureBeingSelected[daysAsignatureBeingSelected.findIndex(x => x == dayInsertected)];
              const InitialHourOnlyByDayIntersected = hourByDayIntersected.split('-')[0];
              const FinalHourOnlyByDayIntersected = hourByDayIntersected.split('-')[1];
              const InitialHourOnlyByDayBeingSelected = hourBeingSelectedByDay.split('-')[0];
              const FinalHourOnlyByDayBeingSelected = hourBeingSelectedByDay.split('-')[1];
              if (this.intersectTime(InitialHourOnlyByDayIntersected, FinalHourOnlyByDayIntersected,
                InitialHourOnlyByDayBeingSelected, FinalHourOnlyByDayBeingSelected)) {
                reject(myAsignature);
                return;
              }
            });
          }
        });
        resolve();
      });
    });
  }
  enrollAsignature = (asignature: AsignatureId): void => {
    this.AsignaturesDontCollide(asignature).then(() => {
      this.asignaturesSubscription.unsubscribe();

      this.CanITakeMoreCredits(asignature).then(() => {
        this.asignaturesSubscription.unsubscribe();
        const asignatureDoc: AngularFirestoreDocument<Asignature> = this.afs.doc<Asignature>('asignatures/' + asignature.id);
        let usersEnrolled = asignature.users !== "" ? asignature.users.split('|') : [];
        usersEnrolled = [...usersEnrolled, this.emailUserLoggedIn];
        asignature.users = usersEnrolled.length > 1 ? usersEnrolled.join("|") : usersEnrolled[0];
        asignature.CurrentQuota++;
        asignatureDoc.update(asignature);
        this.toast.success(`La asignatura ${asignature.name} fue agregada`);
      }).catch(() => {
        this.asignaturesSubscription.unsubscribe();
        this.toast.error(`Límite de crédito alcanzado`);
      });

    }).catch((myAsignature: AsignatureId) => {
      this.asignaturesSubscription.unsubscribe();
      this.toast.warning(`La asignatura ${myAsignature.name} colisiona con ${asignature.name}`);
    });
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
