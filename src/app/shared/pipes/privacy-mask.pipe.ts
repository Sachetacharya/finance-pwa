import { Pipe, PipeTransform, inject } from '@angular/core';
import { PrivacyService } from '../../core/services/privacy.service';

@Pipe({ name: 'privacyMask', standalone: true, pure: false })
export class PrivacyMaskPipe implements PipeTransform {
  private readonly privacy = inject(PrivacyService);

  transform(value: any): any {
    return this.privacy.isHidden() ? '••••' : value;
  }
}
