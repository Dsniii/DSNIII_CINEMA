import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QrViewer } from './qr-viewer';

describe('QrViewer', () => {
  let component: QrViewer;
  let fixture: ComponentFixture<QrViewer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrViewer],
    }).compileComponents();

    fixture = TestBed.createComponent(QrViewer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
