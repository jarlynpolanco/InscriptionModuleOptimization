import { PipeTransform, Pipe } from '@angular/core';
import { Asignature } from '../app.component';


@Pipe({
    name: 'filterselection'
})
export class FilterSelectionPipe implements PipeTransform {
    transform(items: Asignature[]): any {
        if (items == null) {
            return [];
        }
        // I am unsure what id is here. did you mean title?
        return items.filter(item => item.doISelected);
    }
}


@Pipe({
    name: 'sumcredits'
})
export class SumCreditsPipe implements PipeTransform {
    transform(items: Asignature[]): any {
        if (items == null) {
            return [];
        }
        return items.map(a=>a.credits).reduce((a,b)=>a+b,0);
    }
}