import { useState, useEffect } from "react";
import { AppContext } from "./Context/AppContext";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import {
  AdminPage,
  TouristGuidePage,
  TouristPage,
  LoginPage,
  HeroPage,
  SignupPage,
  VerifyCode,
  Welcome,
  PersonalizeProfile,
} from "./pages";
import {
  ManageUsers,
  UsersRequests,
  UserRequest,
  UserProfile,
  AdminSettings,
  MainAdminComponent,
  Logout,
  ChatBot,
  Translator,
  ApplicationReceived,
  ApplicationRejected,
  SwitchToGuide
} from "./components";
import RouteGenerator from "./components/touristComponents/GeneratePath";
import GuideList from "./components/touristComponents/contactLocalGuide";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MyTours from "./components/touristGuideComponents/MyTour";
import AddTour from "./components/touristGuideComponents/AddTour";
import EditTour from "./components/touristGuideComponents/EditTour";
import GuideTours from "./components/touristComponents/GuideTours";
function App() {
  const[routedPath,setRoutedPath]=useState("")
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [entity, setEntity] = useState(null);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  useEffect(() => {
    const userObj = JSON.parse(localStorage.getItem("user"));
    if (userObj) {
      setUser(userObj);
      setIsLoggedIn(true);
      if (userObj.role === 2) setEntity("admin");
      else if (userObj.role === 1) setEntity("touristGuide");
      else setEntity("tourist");
    }
  }, [isLoggedIn]);

  useEffect(()=>
  {
    if(entity==="tourist" && routedPath!=="")
    {
      console.log("hello")
      navigate(routedPath)
      setRoutedPath("")
    }
  },[routedPath,entity,navigate])
  return (
    <>
      <AppContext.Provider
        value={{
          user,
          isLoggedIn,
          entity,
          setIsLoggedIn,
          setUser,
          setEntity,
          step,
          setStep,
          setRoutedPath

        }}
      >
        <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
        <Routes>
          {!isLoggedIn ? (
            <>
              <Route path="/" element={<HeroPage />} />
              <Route path="/home" element={<HeroPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/verify-code" element={<VerifyCode />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          ) : (
            <>
              <Route path="*" element={<Navigate to={`/${entity}`} />} />
              {entity === "admin" && (
                <>        
                  <Route path="/admin" element={<AdminPage />}>
                   <Route index element={<ManageUsers />} />
                    {/* <Route path="/admin" element={<MainAdminComponent />} /> */}
                    <Route path="manage-users" element={<ManageUsers />} />
                    <Route path="logout" element={<Logout />} />
                    <Route
                      path="manage-users/:userId"
                      element={<UserProfile />}
                    />
                    <Route
                      path="user-requests/:userId"
                      element={<UserRequest />}
                    />
                    <Route path="user-requests" element={<UsersRequests />} />
                    <Route path="settings" element={<AdminSettings />} />
                  </Route>
                </>
              )}

              {entity === "touristGuide" && (
                <>
            
                  <Route path="/touristGuide" element={<TouristGuidePage />}>
                    <Route index element={<MyTours />} />
                    <Route path="add-tour" element={<AddTour />} />
                    <Route path="edit-tour/:id" element={<EditTour />} />
                    <Route path="logout" element={<Logout />}/>
                  </Route>
                </>
              )}

              {entity === "tourist" && (
                <>
                  <Route path="/tourist" element={<TouristPage />}>
                    <Route path="guides/:guideId" element={<GuideTours />} />
                    <Route index element={<ChatBot />} />
                    <Route path="personalize-profile" element={<PersonalizeProfile />} />
                    {/* <Route index element={<TouristPage />} /> */}
                    <Route path="contact-local-guide" element={<GuideList />}/>
                    <Route path="language-translator" element={<Translator />}/>
                    <Route path="logout" element={<Logout />}/>
                    <Route path="application-received" element={<ApplicationReceived />}/>
                    <Route path="application-rejected" element={<ApplicationRejected />}/>
                    <Route path="switch-to-local-guide" element={<SwitchToGuide />}/>
                    <Route path="generate-route" element={<RouteGenerator />}/>
                  </Route>
                </>
              )}
            </>
          )}
        </Routes>
      </AppContext.Provider>
    </>
  );
}

export default App;
