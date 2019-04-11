import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgModule, LOCALE_ID } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { AngularFireModule } from '@angular/fire';
import { AngularFireStorageModule } from '@angular/fire/storage';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFirestoreModule } from '@angular/fire/firestore';

import { environment } from '../environments/environment';
import { HierarchyComponent } from './hierarchy/hierarchy.component';
import { TpsComponent } from './tps/tps.component';
import { PathComponent } from './path/path.component';
import { UploadSequenceComponent } from './upload-sequence/upload-sequence.component';

import {
  MatButtonModule,
  MatFormFieldModule,
  MatInputModule,
  MatProgressSpinnerModule,
  MatIconModule,
  MatSidenavModule,
  MatListModule,
  MatSnackBarModule
} from '@angular/material';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialogModule } from '@angular/material/dialog';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';

import { HttpClientModule } from '@angular/common/http';
import {
  RegistrasiComponent,
  CopySnackBarComponent
} from './registrasi/registrasi.component';
import { ThumbnailComponent } from './thumbnail/thumbnail.component';
import { ApproverComponent } from './approver/approver.component';
import { FotoComponent } from './foto/foto.component';
import { HieLinkComponent } from './hie-link/hie-link.component';
import {
  LaporButtonComponent,
  LaporReasonDialogComponent
} from './lapor-button/lapor-button.component';
import { ChatComponent } from './chat/chat.component';
import { registerLocaleData } from '@angular/common';
import localeId from '@angular/common/locales/id';
import { OrangComponent } from './orang/orang.component';
import { ProfileComponent } from './profile/profile.component';
import { MetaComponent } from './meta/meta.component';
import { HomeComponent } from './home/home.component';
import { KontakComponent } from './kontak/kontak.component';
import {
  CarouselComponent,
  BottomSheetErrorComponent
} from './carousel/carousel.component';
import { ScoreboardComponent } from './scoreboard/scoreboard.component';
import { TweetComponent } from './tweet/tweet.component';
import { CariKelComponent } from './cari-kel/cari-kel.component';

@NgModule({
  entryComponents: [
    RegistrasiComponent,
    CopySnackBarComponent,
    LaporReasonDialogComponent,
    BottomSheetErrorComponent
  ],
  declarations: [
    AppComponent,
    HierarchyComponent,
    TpsComponent,
    PathComponent,
    UploadSequenceComponent,
    RegistrasiComponent,
    CopySnackBarComponent,
    ThumbnailComponent,
    ApproverComponent,
    FotoComponent,
    HieLinkComponent,
    LaporButtonComponent,
    LaporReasonDialogComponent,
    ChatComponent,
    OrangComponent,
    ProfileComponent,
    MetaComponent,
    HomeComponent,
    KontakComponent,
    CarouselComponent,
    BottomSheetErrorComponent,
    ScoreboardComponent,
    TweetComponent,
    CariKelComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,

    HttpClientModule,

    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule,
    AngularFirestoreModule,
    AngularFireStorageModule,
    AppRoutingModule,

    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    ScrollingModule,

    MatToolbarModule,
    MatRadioModule,
    MatCheckboxModule,
    MatMenuModule,
    MatTabsModule,
    MatAutocompleteModule,
    MatBadgeModule,
    MatDialogModule,
    MatBottomSheetModule
  ],
  providers: [{ provide: LOCALE_ID, useValue: 'id' }, Title],
  bootstrap: [AppComponent]
})
export class AppModule {}

registerLocaleData(localeId, 'id');
