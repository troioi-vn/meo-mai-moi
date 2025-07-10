import React from 'react';
import HelperApplicationForm from '../components/HelperApplicationForm';

const ApplyToHelpPage: React.FC = () => {
  return (
    <div className="apply-to-help-page">
      <h1>Apply to Become a Helper</h1>
      <p>Please fill out the form below to apply to become a cat helper.</p>
      <HelperApplicationForm />
    </div>
  );
};

export default ApplyToHelpPage;