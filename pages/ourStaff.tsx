// src/components/OurStaff.tsx

import React from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Define a type for our staff member object for type safety
type StaffMember = {
  id: number;
  name: string;
  position: string;
  imageUrl: string;
  bio: string;
};

// --- Staff Data ---
const staffData: StaffMember[] = [
  {
    id: 1,
    name: 'Nuwan Silva',
    position: 'Head Chef',
    imageUrl:
      'https://s3.amazonaws.com/bizenglish/wp-content/uploads/2023/03/15120002/International-award-winning-culinary-expert-Nuwan-Silva-Executive-Chef-at-Courtyard-by-Marriott-Colombo-e1678861849201.jpg',
    bio: 'With over 20 years of experience, Nuwan ensures every guest feels at home at Ralahami Hotel with his deliciously prepared meals.',
  },
  {
    id: 2,
    name: 'Samantha Silva',
    position: 'Executive Chef',
    imageUrl:
      'https://livingmagazine.lk/wp-content/uploads/2020/11/CELEBRITY-CHEF-PETER-KURUVITA-LIVING-MAGAZINE-4.jpg',
    bio: 'Samantha masterfully orchestrates the daily operations, guaranteeing a seamless and luxurious stay.',
  },
  {
    id: 3,
    name: 'Chef Nimal',
    position: 'Executive Chef',
    imageUrl:
      'https://d3prz3jkfh1dmo.cloudfront.net/2021/02/Cooking-Class-5.jpg',
    bio: 'Chef Nimal brings the authentic flavors of Sri Lanka to your plate with passion and creativity.',
  },
  {
    id: 4,
    name: 'Priya Kumari',
    position: 'Cashier',
    imageUrl:
      'https://www.shutterstock.com/image-photo/head-shot-portrait-successful-multiracial-600nw-1364480012.jpg',
    bio: 'Ms Priya is our dedicated cashier making your order placements fast and hassle free.',
  },
  {
    id: 5,
    name: 'Saman Wijerathne',
    position: 'Manager',
    imageUrl: 'https://www.srilankan.com/images/news/ASHOK_PATHIRAGE.jpg',
    bio: 'Mr Saman is our dedicated manager, overseeing all operations to ensure your experience is seamless and enjoyable..',
  },
];

// --- Main Component ---
const OurStaffPage = () => {
  return (
    <>
      <Navbar />
      <div className="py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="space-y-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Meet the Heart of Ralahami Hotel
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
              Our dedicated team is committed to making your stay unforgettable.
            </p>
          </div>

          {/* Staff Grid */}
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {staffData.map((staff) => (
              <div
                key={staff.id}
                className="group transform overflow-hidden rounded-xl bg-white shadow-md transition duration-300 ease-in-out hover:-translate-y-2 hover:shadow-xl dark:bg-neutral-800"
              >
                <img
                  src={staff.imageUrl}
                  alt={`Profile of ${staff.name}`}
                  className="h-72 w-full object-cover object-center"
                />
                <div className="p-6 text-center">
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                    {staff.name}
                  </h3>
                  <p className="text-md font-medium text-amber-600 dark:text-amber-500">
                    {staff.position}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                    {staff.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Vision, Mission & Values Section */}
          <div className="mt-20 space-y-12 text-center">
            {/* Vision */}
            <div>
              <h2 className="text-3xl font-semibold text-amber-700 dark:text-amber-500 mb-3">
                Our Vision
              </h2>
              <p className="mx-auto max-w-3xl text-lg text-neutral-700 dark:text-neutral-300">
                To be Sri Lanka’s most trusted hospitality brand — blending
                tradition, sustainability, and innovation to create unforgettable
                experiences that feel like home.
              </p>
            </div>

            {/* Mission */}
            <div>
              <h2 className="text-3xl font-semibold text-amber-700 dark:text-amber-500 mb-3">
                Our Mission
              </h2>
              <p className="mx-auto max-w-3xl text-lg text-neutral-700 dark:text-neutral-300">
                To deliver authentic Sri Lankan hospitality with warmth and care,
                providing guests with personalized service, delicious cuisine,
                and comfortable spaces crafted with passion and love.
              </p>
            </div>

            {/* Values */}
            <div>
              <h2 className="text-3xl font-semibold text-amber-700 dark:text-amber-500 mb-3">
                Our Values
              </h2>
              <div className="mx-auto max-w-5xl grid gap-8 sm:grid-cols-2 lg:grid-cols-3 text-neutral-700 dark:text-neutral-300">
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-md p-6 hover:shadow-lg transition">
                  <h3 className="text-xl font-semibold text-amber-600 mb-2">
                    Hospitality
                  </h3>
                  <p>
                    We welcome every guest like family, ensuring warmth and
                    respect in every interaction.
                  </p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-md p-6 hover:shadow-lg transition">
                  <h3 className="text-xl font-semibold text-amber-600 mb-2">
                    Integrity
                  </h3>
                  <p>
                    We uphold honesty, transparency, and ethical values in all we
                    do — building trust that lasts.
                  </p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-md p-6 hover:shadow-lg transition">
                  <h3 className="text-xl font-semibold text-amber-600 mb-2">
                    Sustainability
                  </h3>
                  <p>
                    We operate responsibly, preserving nature and empowering our
                    local communities for a better tomorrow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default OurStaffPage;
