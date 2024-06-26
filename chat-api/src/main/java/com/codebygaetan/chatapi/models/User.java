package com.codebygaetan.chatapi.models;

import lombok.Data;

@Data
public class User {
  private String firstName;
  private String lastName;
  private String email;
  private Boolean isCustomer;
}
