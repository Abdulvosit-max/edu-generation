import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
// import AuthOverlay from "./components/AuthOverlay"; // Removed
import Feed from "./pages/Feed";
import Chat from "./pages/Chat";
import ImageGen from "./pages/ImageGen";
import SlideGen from "./pages/SlideGen";
import TestGen from "./pages/TestGen";
import VideoGen from "./pages/VideoGen";
import Account from "./pages/Account";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/image" element={<ImageGen />} />
          <Route path="/slide" element={<SlideGen />} />
          <Route path="/test" element={<TestGen />} />
          <Route path="/video" element={<VideoGen />} />
          <Route path="/account" element={<Account />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
