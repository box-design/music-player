import { Routes, Route } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import Home from '@/pages/Home';
import SearchPage from '@/pages/Search';
import PlaylistDetail from '@/pages/Playlist/Detail';
import AlbumDetail from '@/pages/Album/Detail';
import ArtistDetail from '@/pages/Artist/Detail';
import ArtistList from '@/pages/Artist/List';
import ToplistPage from '@/pages/Toplist';
import PrivateFM from '@/pages/PrivateFM';
import DailyRecommend from '@/pages/DailyRecommend';
import UserProfile from '@/pages/User/Profile';
import LikedMusic from '@/pages/User/LikedMusic';
import Record from '@/pages/User/Record';
import Cloud from '@/pages/User/Cloud';
import Login from '@/pages/User/Login';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="playlist/:id" element={<PlaylistDetail />} />
        <Route path="album/:id" element={<AlbumDetail />} />
        <Route path="artist/:id" element={<ArtistDetail />} />
        <Route path="artist/list" element={<ArtistList />} />
        <Route path="toplist" element={<ToplistPage />} />
        <Route path="fm" element={<PrivateFM />} />
        <Route path="daily" element={<DailyRecommend />} />
        <Route path="recommend/songs" element={<DailyRecommend />} />
        <Route path="user" element={<UserProfile />} />
        <Route path="user/liked" element={<LikedMusic />} />
        <Route path="user/record" element={<Record />} />
        <Route path="user/cloud" element={<Cloud />} />
        <Route path="login" element={<Login />} />
      </Route>
    </Routes>
  );
}
