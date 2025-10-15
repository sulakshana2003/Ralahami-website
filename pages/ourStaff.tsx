// src/components/OurStaff.tsx

import React from 'react';

// Define a type for our staff member object for type safety
type StaffMember = {
  id: number;
  name: string;
  position: string;
  imageUrl: string;
  bio: string;
};

// --- Staff Data ---
// In a real application, you would fetch this data from an API.
const staffData: StaffMember[] = [
  {
    id: 1,
    name: 'Nuwan Silva',
    position: 'Head Chef',
    imageUrl: 'https://s3.amazonaws.com/bizenglish/wp-content/uploads/2023/03/15120002/International-award-winning-culinary-expert-Nuwan-Silva-Executive-Chef-at-Courtyard-by-Marriott-Colombo-e1678861849201.jpg',
    bio: 'With over 20 years of experience, Nuwan ensures every guest feels at home at Ralahami Hotel with his deliciously prepared meals.',
  },
  {
    id: 2,
    name: 'Samantha Silva',
    position: 'Executive Chef',
    imageUrl: 'https://livingmagazine.lk/wp-content/uploads/2020/11/CELEBRITY-CHEF-PETER-KURUVITA-LIVING-MAGAZINE-4.jpg',
    bio: 'Samantha masterfully orchestrates the daily operations, guaranteeing a seamless and luxurious stay.',
  },
  {
    id: 3,
    name: 'Chef Nimal',
    position: 'Executive Chef',
    imageUrl: 'https://d3prz3jkfh1dmo.cloudfront.net/2021/02/Cooking-Class-5.jpg',
    bio: 'Chef Nimal brings the authentic flavors of Sri Lanka to your plate with passion and creativity.',
  },
  {
    id: 4,
    name: 'Priya Kumari',
    position: 'Cashier',
    imageUrl: 'https://www.shutterstock.com/image-photo/head-shot-portrait-successful-multiracial-600nw-1364480012.jpg',
    bio: 'Priya is our dedicated cashier making your order placements fast and hassle free.',
  },
];

// The main component for the "Our Staff" page, now using Tailwind CSS
const OurStaffPage = () => {
  return (
    // The main container inherits the themed background from your global styles
    <div className="py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Meet the Heart of Ralahami Hotel
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
            Our dedicated team is committed to making your stay unforgettable.
          </p>
        </div>

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
      </div>
    </div>
  );
};

export default OurStaffPage;