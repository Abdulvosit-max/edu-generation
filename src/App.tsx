import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";

const Feed = lazy(() => import("./pages/Feed"));
const Chat = lazy(() => import("./pages/Chat"));
const ImageGen = lazy(() => import("./pages/ImageGen"));
const SlideGen = lazy(() => import("./pages/SlideGen"));
const TestGen = lazy(() => import("./pages/TestGen"));
const VideoGen = lazy(() => import("./pages/VideoGen"));
const Account = lazy(() => import("./pages/Account"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Feed />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/image" element={<ImageGen />} />
              <Route path="/slide" element={<SlideGen />} />
              <Route path="/test" element={<TestGen />} />
              <Route path="/video" element={<VideoGen />} />
              <Route path="/account" element={<Account />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Layout>
    </BrowserRouter>
  );
}
