import {Component, Input, OnInit} from '@angular/core';

import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import { Asignature, AsignatureId } from '../app.component';
import { AngularFirestoreDocument, AngularFirestore } from '@angular/fire/firestore';

@Component({
  selector: 'ngbd-modal-basic',
  templateUrl: './modal-basic.html'
})
export class NgbdModalBasic implements OnInit{
  ngOnInit(){
    console.log(this.Email);
    console.log(this.Asignature);
  }
  @Input()
  public IsDisabled:boolean;
  @Input()
  public Email:string;
  @Input()
  public Asignature:AsignatureId;

  closeResult: string;

  constructor(private modalService: NgbModal,private afs:AngularFirestore) {
    
  }
  NotifyRequest(){
    
    const asignatureDoc: AngularFirestoreDocument<Asignature> = this.afs.doc<Asignature>('asignatures/' + this.Asignature.id);
    
    let usersRequesting = this.Asignature.usersRequesting !== "" ? this.Asignature.usersRequesting.split('|') : [];
    usersRequesting = [...usersRequesting, this.Email];
    this.Asignature.usersRequesting = usersRequesting.length > 1 ? usersRequesting.join("|") : usersRequesting[0];
    asignatureDoc.update(this.Asignature);
    
    
  }
  open(content) {
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'}).result.then((result) => {
      this.closeResult = ``;
    }, (reason) => {
      this.closeResult = ``;
    });
  }
}
