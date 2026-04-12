export interface RawEvent {
  organizationId: number;
  id: string;
  description?: string;
  imagePath?: string;
  organizationProfilePicture?: string;
  name: string;
  organizationName: string;
  location: string;
  startsOn: string;
  endsOn: string;
  theme?: string;
  categoryNames?: string[];
  benefitNames?: string[];
}

export interface FormattedEvent {
  id: string;
  src: string;
  content: {
    title: string;
    descriptionHtml: string;
    descriptionText: string;
    location: string;
    startTime: string;
    endTime: string;
    theme: string;
    categories: string[];
    benefits: string[];
    imageUrl: string | null;
  };
  organization: {
    name: string;
    id: string;
  };
}

export interface RawOrganization {
  Id: string;
  Name: string;
  Description?: string;
  WebsiteKey?: string;
  Summary?: string;
  ProfilePicture?: string;
  CategoryNames?: string[];
}