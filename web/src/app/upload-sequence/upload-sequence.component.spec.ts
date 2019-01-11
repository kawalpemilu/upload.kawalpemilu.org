import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadSequenceComponent } from './upload-sequence.component';

describe('UploadSequenceComponent', () => {
  let component: UploadSequenceComponent;
  let fixture: ComponentFixture<UploadSequenceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UploadSequenceComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UploadSequenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
