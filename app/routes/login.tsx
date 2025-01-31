import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import { useEffect } from "react";
import { StyledFirebaseAuth } from "react-firebaseui";
import { ActionFunction, LoaderFunction, redirect } from "remix";
import { commitSession, getSession } from "~/utils/session.server";
import { getAdmin } from "~/utils/firebase.server";
import { getUserId } from "~/utils/session.server";

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request);
  if (userId) {
    return redirect("/");
  }
  return null;
};

export const action: ActionFunction = async ({ request }) => {
  const authorizationHeader = request.headers.get("Authorization");
  if (
    authorizationHeader === null ||
    !authorizationHeader.startsWith("Bearer ")
  ) {
    return new Response("Authorization header must be set", { status: 400 });
  }
  const idToken = authorizationHeader.substring(7, authorizationHeader.length);
  const admin = getAdmin();
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const uid = decodedToken.uid;
  const session = await getSession();
  session.set("uid", uid);
  return new Response("/", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
};

const firebaseConfig = {
  apiKey: "AIzaSyB5KP2tECCIvtP5AP7uLyQQP9sR9gajYdg",
  authDomain: "watch-duty-manager.firebaseapp.com",
  projectId: "watch-duty-manager",
  storageBucket: "watch-duty-manager.appspot.com",
  messagingSenderId: "205562074111",
  appId: "1:205562074111:web:f2659018b342dcc9578dca",
  measurementId: "G-YNB0BEJ5GC",
};

if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
}

const uiConfig: firebaseui.auth.Config = {
  signInFlow: "popup",
  signInOptions: [firebase.auth.EmailAuthProvider.PROVIDER_ID],
  callbacks: { signInSuccessWithAuthResult: () => false },
};

export default function Login() {
  useEffect(() => {
    const unregisterAuthObserver = firebase
      .auth()
      .onAuthStateChanged(async (user) => {
        if (user === null) {
          return;
        }
        // tokenをheaderに入れてサーバーに送り、サーバー側でtokenをfirebaseと照合する
        // ユーザーが確認できたらset-cookieでクライアント側にcookieを設定する
        const token = await user.getIdToken();
        await fetch("./login", {
          method: "POST",
          headers: new Headers({
            Authorization: token ? `Bearer ${token}` : "",
          }),
        });
        // Set-Cookie後にリダイレクトする
        // 本当にこんな書き方でいいのかだいぶ怪しい
        location.href = "/";
      });
    return () => unregisterAuthObserver(); // Make sure we un-register Firebase observers when the component unmounts.
  }, []);
  return (
    <StyledFirebaseAuth uiConfig={uiConfig} firebaseAuth={firebase.auth()} />
  );
}
